/*
 * File purpose
 * - Move AW stats history snapshots from frontend page visits to DB automation
 * - Snapshot all users once per day through a security definer function
 * - Schedule daily execution through pg_cron when available
 */

begin;

create or replace function public.aw_max_err_for_age(p_real_age numeric)
returns numeric
language sql
immutable
as $$
  select greatest(p_real_age - 16, 116 - p_real_age);
$$;

create or replace function public.aw_snapshot_user_stats(
  p_user_id uuid,
  p_snapshot_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aw_age numeric;
  v_aw_score_norm_pct numeric;
  v_avg_accuracy_pct numeric;
begin
  /*
   * AW age / AW score are based on current image aggregates.
   * UI displays AW score around 100, where 100 means "exactly real age".
   */
  select
    avg(coalesce(i.aw_age_image, i.avg_guessed_age)),
    avg(
      case
        when i.real_age_years is not null
          and coalesce(i.aw_age_image, i.avg_guessed_age) is not null
          and public.aw_max_err_for_age(i.real_age_years) > 0
        then 100 + ((coalesce(i.aw_age_image, i.avg_guessed_age) - i.real_age_years) / public.aw_max_err_for_age(i.real_age_years)) * 100
        else null
      end
    )
  into v_aw_age, v_aw_score_norm_pct
  from public.images i
  where i.uploader_user_id = p_user_id
    and coalesce(i.include_in_global_aw, true) = true
    and i.real_age_years is not null
    and coalesce(i.aw_age_image, i.avg_guessed_age) is not null;

  /*
   * Average accuracy of guesses made by the user.
   * 100 % = exact guess, lower values mean larger normalized error.
   */
  select
    avg(
      case
        when img.real_age_years is not null
          and g.guessed_age is not null
          and public.aw_max_err_for_age(img.real_age_years) > 0
        then greatest(0, 100 - (abs(g.guessed_age - img.real_age_years) / public.aw_max_err_for_age(img.real_age_years)) * 100)
        else null
      end
    )
  into v_avg_accuracy_pct
  from public.age_guesses g
  join public.images img on img.id = g.image_id
  where g.guesser_user_id = p_user_id;

  insert into public.aw_user_stats_history (
    user_id,
    snapshot_date,
    aw_age,
    aw_score_norm_pct,
    avg_accuracy_pct,
    power_score
  )
  values (
    p_user_id,
    p_snapshot_date,
    v_aw_age,
    v_aw_score_norm_pct,
    v_avg_accuracy_pct,
    null
  )
  on conflict (user_id, snapshot_date)
  do update set
    aw_age = excluded.aw_age,
    aw_score_norm_pct = excluded.aw_score_norm_pct,
    avg_accuracy_pct = excluded.avg_accuracy_pct,
    power_score = coalesce(public.aw_user_stats_history.power_score, excluded.power_score);
end;
$$;

create or replace function public.aw_snapshot_all_user_stats(
  p_snapshot_date date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_count integer := 0;
begin
  for v_user in
    select u.id
    from auth.users u
  loop
    perform public.aw_snapshot_user_stats(v_user.id, p_snapshot_date);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.aw_snapshot_user_stats(uuid, date) to service_role;
grant execute on function public.aw_snapshot_all_user_stats(date) to service_role;

select public.aw_snapshot_all_user_stats(current_date);

do $$
begin
  create extension if not exists pg_cron with schema extensions;
exception
  when insufficient_privilege or undefined_file then
    raise notice 'pg_cron extension is not available in this environment; run select public.aw_snapshot_all_user_stats(current_date) from an external scheduler.';
end;
$$;

do $$
declare
  v_job record;
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if to_regclass('cron.job') is not null then
      for v_job in
        select jobid
        from cron.job
        where jobname = 'aw-stats-history-daily'
      loop
        begin
          perform cron.unschedule(v_job.jobid);
        exception
          when others then
            raise notice 'Could not unschedule cron job aw-stats-history-daily with jobid %, continuing: %', v_job.jobid, sqlerrm;
        end;
      end loop;
    end if;

    perform cron.schedule(
      'aw-stats-history-daily',
      '20 2 * * *',
      'select public.aw_snapshot_all_user_stats(current_date);'
    );
  else
    raise notice 'cron schema is not available; AW stats history automation was not scheduled.';
  end if;
exception
  when undefined_function or undefined_table then
    raise notice 'pg_cron is not fully available; run select public.aw_snapshot_all_user_stats(current_date) from an external scheduler.';
end;
$$;

commit;
