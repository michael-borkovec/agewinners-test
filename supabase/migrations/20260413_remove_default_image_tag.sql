/*
 * File purpose
 * - Remove the former default "bezna" tag from image tags
 * - Keep photos without an explicit tag untagged
 * - Preserve legacy images.photo_category for compatibility with older code paths
 */

begin;

delete from public.image_tags
where tag = 'bezna';

commit;
