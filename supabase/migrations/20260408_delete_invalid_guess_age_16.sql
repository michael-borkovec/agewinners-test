/**
 * File purpose
 * - Fully reset age guessing data after the feed slider bug
 * - Remove all age guesses for all users
 * - Reset derived AW-related aggregates so all photos become guessable again
 */

begin;

delete from public.age_guesses;

update public.images
set
  guesses_count = 0,
  avg_guessed_age = null,
  aw_age_image = null;

update public.albums
set
  aw_age = null;

commit;
