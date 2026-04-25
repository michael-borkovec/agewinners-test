# IMPORTANT
This document is the source of truth for DB structure.
Do not assume anything outside this file.

\# AgeWinners – Database Structure (AW)



This document describes the \*\*current known structure of the AgeWinners database\*\* used by the web application.  

The description is \*\*not guaranteed to be complete\*\* and will be \*\*updated iteratively as the project evolves\*\*.



The goal of this document is to provide \*\*AI assistants and developers with context\*\* about how the database is structured.



---



\# Overview



The AgeWinners database is built on \*\*Supabase (PostgreSQL)\*\*.



Core concepts:



\- Users create \*\*posts\*\*

\- Posts contain \*\*images\*\*

\- Images may belong to \*\*albums\*\*

\- Other users \*\*guess the age\*\* of a person in an image

\- Some data is revealed \*\*after time delays\*\*

\- Identity may remain \*\*anonymous for a period\*\*



---



\# Tables

\## notifications

Stores in-app notifications for a specific recipient user.

Primary key:

- `id` (bigint)

Important fields:

| column | type | description |
|------|------|-------------|
| user_id | uuid | recipient user |
| actor_user_id | uuid | user who caused the event |
| type | text | notification type |
| entity_id | uuid | related entity, currently `connection_requests.id` |
| is_read | boolean | unread/read state |
| read_at | timestamptz | time when notification was read |
| created_at | timestamptz | creation time |

Current supported types:

- `connection_request_received`
- `connection_request_accepted`
- `connection_request_declined`

---

\## post_stories

Stores an optional author story attached to a post. A post can have at most one story.

Primary key:

- `id` (bigint)

Important fields:

| column | type | description |
|------|------|-------------|
| post_id | bigint | parent post |
| author_user_id | uuid | story author, normally the post author |
| body | text | optional story text, max 3000 chars |
| hidden_by_moderation | boolean | moderation hide flag |
| hidden_by_suspension | boolean | suspension hide flag |
| created_at | timestamptz | creation time |
| updated_at | timestamptz | last update time |

Related tables:

- `post_story_images` stores story-only images, separate from tipované `images`
- `post_story_likes` stores reactions to stories
- `post_story_reports` stores story reports
- `comments.target_type` supports `story` with `comments.story_id`

Visibility:

- follows parent post effective visibility
- if post is in an album, album visibility overrides post visibility
- owner and privileged viewers can access
- My Tips loader returns story only after content reveal, unless viewer is privileged

---

\## aw\_user\_stats\_history

Stores daily snapshots of selected profile statistics for historical charts.

Primary key:

- `user_id` + `snapshot_date`

Important fields:

| column | type | description |
|------|------|-------------|
| user_id | uuid | owner of the snapshot |
| snapshot_date | date | one snapshot per user and day |
| aw_age | numeric | current AW age snapshot |
| aw_score_norm_pct | numeric | current AW score snapshot in normalized percent form |
| avg_accuracy_pct | numeric | current average guess accuracy snapshot |
| power_score | numeric | current power score snapshot |
| created_at | timestamptz | insert time |
| updated_at | timestamptz | last overwrite time for same day |

Usage:

- profile statistics history charts
- month/year trend views for AW age, AW score, average accuracy

Security:

- RLS enabled
- user can read/write only own rows

---

\## wellbeing\_daily\_entries

Stores voluntary daily wellbeing check-ins for the `/stats?section=wellbeing` section.

Primary key:

- `user_id` + `entry_date`

Important fields:

| column | type | description |
|------|------|-------------|
| user_id | uuid | owner of the entry |
| entry_date | date | one entry per user and day |
| mood | text | selected mood: `lehka`, `klid`, `radost`, `unava`, `napeti` |
| mood_score | smallint | numeric mood value for charts, 1-10 |
| energy_score | smallint | subjective energy value, 1-10 |
| sleep_hours | numeric | sleep hours, 0-24 |
| movement_minutes | integer | movement in minutes, 0-1440 |
| water_glasses | smallint | water glasses, 0-30 |
| water_liters | numeric | water in liters, 0.5 steps from 0.5 to 5 |
| food_amount | text | optional food amount: `malo`, `bezne`, `moc`, `bez_jidla` |
| food_type | text | optional food type: `dietni`, `vegan`, `vegetarian`, `vyvazena`, `bezna`, `sladke`, `maso`, `nezdrava` |
| entry_visibility | text | visibility for the whole daily entry: `everyone`, `contacts`, or `private`; defaults to `everyone` |
| self_care_done | boolean | optional self-care flag |
| note | text | optional private note, max 1000 chars |
| created_at | timestamptz | insert time |
| updated_at | timestamptz | last update time |

Usage:

- daily wellbeing save button
- mood, energy, sleep, movement, water, food charts and editable monthly history in the wellbeing stats section

Security:

- RLS enabled
- user can select/insert/update/delete only own rows

---

\## wellbeing\_plan\_entries

Stores long-term plans and habits for sleep, movement, water, and food.

Primary key:

- `user_id` + `plan_date`

Important fields:

| column | type | description |
|------|------|-------------|
| user_id | uuid | owner of the plan row |
| plan_date | date | one plan row per user and day |
| sleep_hours | numeric | planned sleep hours |
| movement_minutes | integer | planned movement in minutes |
| water_liters | numeric | planned water in liters |
| food_amount | text | planned food amount |
| food_type | text | planned food type |
| created_at | timestamptz | insert time |
| updated_at | timestamptz | last update time |

Security:

- RLS enabled
- user can select/insert/update/delete only own rows

---

\## profile\_visits

Stores visits of public profile cards, used by `/stats?section=traffic`.

Primary key:

- `id` (bigint)

Important fields:

| column | type | description |
|------|------|-------------|
| id | bigint | visit id |
| viewed_user_id | uuid | profile owner whose profile was viewed |
| viewer_user_id | uuid | authenticated user who viewed the profile |
| viewed_at | timestamptz | visit timestamp |

Usage:

- profile page `/users/[userId]` records a visit when another authenticated user opens the profile
- traffic stats show visits over the last 30 days and recent visitors
- own profile views are not recorded

Security:

- RLS enabled
- authenticated users can insert only their own visits as `viewer_user_id`
- users can select only visits where they are `viewed_user_id`

---

\## aw\_challenges

Stores user-created AW challenges. A challenge stores the AW score snapshot from the start of the challenge and the target AW score for later comparison. It does not define or change AW score calculation rules.

Primary key:

- `id` (uuid)

Important fields:

| column | type | description |
|------|------|-------------|
| owner_user_id | uuid | challenge owner |
| title | text | challenge title |
| public_message | text | optional text for public presentation |
| private_goal | text | optional personal goal |
| private_goal_visibility | text | `private` by default, can later become `everyone` |
| visibility | text | `private`, `contacts`, or `everyone` |
| status | text | `draft`, `active`, `completed`, `missed`, `extended`, `cancelled`, `archived` |
| start_date | date | challenge start date |
| target_date_original | date | original deadline; immutable after activation |
| target_date_current | date | current deadline; may be extended |
| baseline_aw_score_norm_pct | numeric | AW score snapshot at challenge start, in existing normalized AW score scale |
| target_aw_score_norm_pct | numeric | target AW score in existing normalized AW score scale |
| photo_scope | text | `auto_period` or `challenge_tag` |
| challenge_tag | text | tag used when `photo_scope = challenge_tag` |
| include_experimental_images | boolean | for `auto_period` challenges, whether experimental photos are included |
| activated_at | timestamptz | activation time |
| completed_at | timestamptz | completion time |
| extended_at | timestamptz | extension time |
| private_goal_published_at | timestamptz | time when private goal was made public |

Security:

- RLS enabled
- users can select/insert/update only own challenges
- authenticated users can select public challenges where `visibility = everyone`
- accepted contacts can select challenges where `visibility = contacts`
- users can delete only own draft challenges
- after activation, baseline AW score, target AW score, original deadline, photo scope, start date, and public message are immutable
- active challenges allow limited editing of title, current deadline extension, visibility, private goal, and private goal visibility
- challenge tag can be created once when missing; after it exists, it is immutable
- challenge tag is unique per owner user; different users may use the same tag text
- active challenge can switch from `auto_period` to `challenge_tag` only when the tag is created in the same update
- `auto_period` challenges use image `taken_at` date for membership, not post publication date
- `include_experimental_images` applies only to `auto_period` challenges

---

\## aw\_challenge\_images

Stores durable image membership in a challenge. This table is used to lock in photos that have already been included, so a later image metadata change cannot remove them from the historical challenge set.

Primary key:

- `challenge_id` + `image_id`

Important fields:

| column | type | description |
|------|------|-------------|
| challenge_id | uuid | related AW challenge |
| image_id | bigint | related image |
| source | text | `auto_period`, `challenge_tag`, or `reference` |
| locked_in_at | timestamptz | time when the image was locked into the challenge |
| was_experimental_at_lock | boolean | whether the image was experimental when it was locked |

Security:

- RLS enabled
- challenge owner can insert membership rows
- challenge owner can read rows
- authenticated users can read membership rows of public challenges
- accepted contacts can read membership rows of contact-visible challenges

Usage:

- `challenge_tag` challenges are driven by the challenge tag on photos/posts
- when applying a challenge tag to a post, the intended behavior is to assign it to all photos in that post
- `auto_period` challenges include photos by `taken_at` date within the challenge interval
- once a photo is locked into a challenge, later marking it as experimental must not remove it from the challenge

---

\## app\_runtime\_settings

Stores small globally applied runtime configuration values managed from admin UI.

Primary key:

- `setting_key`

Important fields:

| column | type | description |
|------|------|-------------|
| setting_key | text | unique setting identifier |
| int_value | integer | numeric setting value |
| text_value | text | optional text setting value |
| updated_at | timestamptz | last change time |
| updated_by | uuid | admin user who last changed the value |

Current usage:

- `post_reveal_delay_days` = global number of days needed for post de-anonymization in `Moje tipy`

Security:

- RLS enabled
- public read is allowed only for safe runtime values
- writes are done via admin server API



\## user\_profiles



Stores profile information for each registered user.



Primary key:

\- `user\_id` (UUID) — references Supabase Auth user



Important fields:



| column | type | description |

|------|------|-------------|

| user\_id | uuid | user id from Supabase auth |

| registration\_number | bigint | permanent signup order number, unique and increasing from 1 |

| display\_name | text | public name shown in UI |

| avatar\_url | text | profile avatar |

| bio | text | user biography |

| super\_user | boolean | admin/special user flag |

| personalization\_ads\_consent | boolean | whether the user granted consent for personalization and ad targeting |

| personalization\_ads\_consent\_at | timestamptz | timestamp when the consent was granted |



Used by:



\- sidebar profile

\- post author display

\- identity reveal logic

\- optional display / sorting by exact signup order



Notes:



\- exact signup order is assigned from `auth.users` creation order

\- `public.user_profiles.registration_number` mirrors the source-of-truth record from `public.user_registration_orders`



---



\## user\_registration\_orders



Stores the exact permanent registration order for each account.



Primary key:



\- `user\_id` (uuid) â€” references `auth.users.id`



Important fields:



| column | type | description |

|------|------|-------------|

| user\_id | uuid | auth user id |

| registration\_number | bigint | unique order number starting at 1 |

| auth\_created\_at | timestamptz | `auth.users.created_at` snapshot used for historical backfill/reference |

| assigned\_at | timestamptz | time when the order number row was created |



Usage:



\- exact ordering of registrations

\- backfill and future synchronization into `public.user_profiles.registration_number`



Security:



\- RLS enabled

\- authenticated user can read only own row



---



\# posts



Represents a \*\*post created by a user\*\*.



A post may contain:



\- single photo

\- multiple photos

\- photos grouped into albums



Important fields:



| column | type | description |

|------|------|-------------|

| id | bigint | primary key |

| user\_id | uuid | author |

| title | text | post title |

| text | text | post description |

| created\_at | timestamp | creation time |



Relations:



Album model notes:

\- `albums` are collections of posts

\- `post_albums` is the active and only source of truth for assigning a post to an album

\- images belong to posts via `post_images`, not directly to albums

\- `posts.album_id` is legacy and should not be used by active logic

\- empty album is a valid state

\- empty post is not a valid state and should be removed
