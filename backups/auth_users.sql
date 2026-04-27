--
-- PostgreSQL database dump
--

\restrict ut07hlt4jKUwKgpBYLWweiEfeRQJQSIkhmOS0GyPHcADN8SNTAheoQJwWL2jvkW

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

-- Started on 2026-04-27 19:42:52

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 4236 (class 0 OID 16525)
-- Dependencies: 357
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4253 (class 0 OID 125969)
-- Dependencies: 415
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4247 (class 0 OID 16929)
-- Dependencies: 373
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.flow_state VALUES ('3ffb4194-2759-483a-af7f-ad7dece06d80', 'a5b9777a-748c-4dbf-8c94-ea42abff4636', '8bf44d73-397c-41a8-a4b2-890850542da7', 's256', 'CKPhYQK1youJgQZpvNak8CAwgv9lx6UoSwflCHVZRlM', 'email', '', '', '2026-04-01 08:44:17.432108+00', '2026-04-01 08:49:20.282957+00', 'email/signup', '2026-04-01 08:49:20.282908+00', NULL, NULL, NULL, NULL, false);
INSERT INTO auth.flow_state VALUES ('bf068194-a891-488f-9d58-4d945419545e', 'a8efc3b0-538d-4293-9af6-7d535991faea', '307951dc-7eae-4167-85c4-ad7a48e290c4', 's256', 'smsY1oyt5BiR33ET6DrByol0hSZ05zcbVk6LIWEBknI', 'recovery', '', '', '2026-04-17 09:37:38.311949+00', '2026-04-17 09:37:38.311949+00', 'recovery', NULL, NULL, NULL, NULL, NULL, false);
INSERT INTO auth.flow_state VALUES ('f48d0c79-a400-485b-a5f0-4eac6458dced', 'a8efc3b0-538d-4293-9af6-7d535991faea', 'bb464c9b-0fd7-4f03-bb6d-8e2005b2b6b7', 's256', 'FanwVYhum8xxYaMWXKjwT1QZ6GClGTWIZ2XkjlG8lKU', 'recovery', '', '', '2026-04-17 09:52:20.601435+00', '2026-04-17 09:52:20.601435+00', 'recovery', NULL, NULL, NULL, NULL, NULL, false);


--
-- TOC entry 4232 (class 0 OID 16495)
-- Dependencies: 353
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'f769233e-5132-4313-8ff6-5505b86791ed', 'authenticated', 'authenticated', 'borkovec@zstudio.cz', '$2a$10$Car3xP3S8TeVBkTb12PtYeMH2VTugKYxdghd.hGVY2TzDzOWWFUve', '2025-12-20 20:08:54.266367+00', NULL, '', '2025-12-20 20:08:40.966905+00', '', NULL, '', '', NULL, '2026-04-21 12:17:54.586167+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "f769233e-5132-4313-8ff6-5505b86791ed", "email": "borkovec@zstudio.cz", "date_of_birth": "1986-07-02", "email_verified": true, "phone_verified": false}', NULL, '2025-12-20 20:08:40.937816+00', '2026-04-21 12:17:54.612498+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', 'authenticated', 'authenticated', 'michael.borkovec@seznam.cz', '$2a$10$pXY1bX6YXpdo/8Ss8zET3.m2ErmVv50WNshmEBYXUFcGa8EJcoYhC', '2025-12-14 09:39:37.256787+00', NULL, '', '2025-12-14 09:39:23.0409+00', '', NULL, '', '', NULL, '2026-04-16 20:44:36.422568+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "f4c293c0-31c7-4278-8ebd-7fb53d21a6c4", "email": "michael.borkovec@seznam.cz", "email_verified": true, "phone_verified": false}', NULL, '2025-12-14 09:39:23.012425+00', '2026-04-16 20:44:36.527644+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'a8efc3b0-538d-4293-9af6-7d535991faea', 'authenticated', 'authenticated', 'm.borkovec@gmail.com', '$2a$10$1aZ79PkGX/aaOdUKoUZhJ.QCNNfSvGtLFg6zlaSVWIXnGtNEs/08i', '2025-12-13 13:35:17.356324+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-25 10:31:42.4635+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "a8efc3b0-538d-4293-9af6-7d535991faea", "email": "m.borkovec@gmail.com", "email_verified": true, "phone_verified": false}', NULL, '2025-12-13 13:35:01.843504+00', '2026-04-27 08:21:27.076884+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'e0554f1c-b98d-4031-86f3-0965ed1f45e0', 'authenticated', 'authenticated', 'ai.petr@agewinners.com', '$2a$10$isW1.EagN7aBctFmfNjEw.IgXYWw98kwiGaXSOCZ8WxQ9mr.o12ce', '2026-04-13 07:19:11.862478+00', NULL, '', '2026-04-13 07:14:33.964902+00', '', NULL, '', '', NULL, '2026-04-17 06:23:55.97312+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "e0554f1c-b98d-4031-86f3-0965ed1f45e0", "email": "ai.petr@agewinners.com", "date_of_birth": "1981-05-05", "email_verified": true, "phone_verified": false}', NULL, '2026-04-13 07:14:33.838124+00', '2026-04-17 06:23:56.062011+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', 'authenticated', 'authenticated', 'ai.andrea@agewinners.com', '$2a$10$7Vp83S7trJIn0EsWDrMpiulkmIYkIqiGb7PixAlDPHWKhe6OHF5Xq', '2026-02-28 19:18:40.194909+00', NULL, '', '2026-02-28 19:18:21.125183+00', '', NULL, '', '', NULL, '2026-04-24 11:52:22.5829+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a", "email": "ai.andrea@agewinners.com", "date_of_birth": "1966-02-28", "email_verified": true, "phone_verified": false}', NULL, '2026-02-28 19:18:21.056942+00', '2026-04-24 12:51:48.793+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'a5b9777a-748c-4dbf-8c94-ea42abff4636', 'authenticated', 'authenticated', 'ai.dominik@agewinners.com', '$2a$10$p/TUVkxgyrHveDeeaveXy.VSxoSHPdK.tO2nRrwCMCpUbhbNwCVG2', '2026-04-01 08:49:20.274436+00', NULL, '', '2026-04-01 08:44:17.450171+00', '', NULL, '', '', NULL, '2026-04-22 06:27:03.644664+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "a5b9777a-748c-4dbf-8c94-ea42abff4636", "email": "ai.dominik@agewinners.com", "date_of_birth": "1966-12-02", "email_verified": true, "phone_verified": false}', NULL, '2026-04-01 08:44:17.371424+00', '2026-04-23 06:02:16.86343+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);


--
-- TOC entry 4238 (class 0 OID 16727)
-- Dependencies: 364
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.identities VALUES ('a8efc3b0-538d-4293-9af6-7d535991faea', 'a8efc3b0-538d-4293-9af6-7d535991faea', '{"sub": "a8efc3b0-538d-4293-9af6-7d535991faea", "email": "m.borkovec@gmail.com", "email_verified": true, "phone_verified": false}', 'email', '2025-12-13 13:35:01.918002+00', '2025-12-13 13:35:01.918065+00', '2025-12-13 13:35:01.918065+00', DEFAULT, 'e2541a6f-5623-40e1-af7d-507032ef7b29');
INSERT INTO auth.identities VALUES ('f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', '{"sub": "f4c293c0-31c7-4278-8ebd-7fb53d21a6c4", "email": "michael.borkovec@seznam.cz", "email_verified": true, "phone_verified": false}', 'email', '2025-12-14 09:39:23.030729+00', '2025-12-14 09:39:23.030784+00', '2025-12-14 09:39:23.030784+00', DEFAULT, 'c7edaf1e-e211-4f63-a625-15756c8a4fa0');
INSERT INTO auth.identities VALUES ('f769233e-5132-4313-8ff6-5505b86791ed', 'f769233e-5132-4313-8ff6-5505b86791ed', '{"sub": "f769233e-5132-4313-8ff6-5505b86791ed", "email": "borkovec@zstudio.cz", "date_of_birth": "1986-07-02", "email_verified": true, "phone_verified": false}', 'email', '2025-12-20 20:08:40.961027+00', '2025-12-20 20:08:40.961085+00', '2025-12-20 20:08:40.961085+00', DEFAULT, '756e368a-f82f-4fd0-8b87-141214632de4');
INSERT INTO auth.identities VALUES ('498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', '{"sub": "498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a", "email": "ai.andrea@agewinners.com", "date_of_birth": "1966-02-28", "email_verified": true, "phone_verified": false}', 'email', '2026-02-28 19:18:21.100075+00', '2026-02-28 19:18:21.100125+00', '2026-02-28 19:18:21.100125+00', DEFAULT, '63aa068b-19aa-4bd2-8264-76391a95e500');
INSERT INTO auth.identities VALUES ('a5b9777a-748c-4dbf-8c94-ea42abff4636', 'a5b9777a-748c-4dbf-8c94-ea42abff4636', '{"sub": "a5b9777a-748c-4dbf-8c94-ea42abff4636", "email": "ai.dominik@agewinners.com", "date_of_birth": "1966-12-02", "email_verified": true, "phone_verified": false}', 'email', '2026-04-01 08:44:17.41904+00', '2026-04-01 08:44:17.419093+00', '2026-04-01 08:44:17.419093+00', DEFAULT, '7463c6f4-5c67-4509-95c2-561a8e955474');
INSERT INTO auth.identities VALUES ('e0554f1c-b98d-4031-86f3-0965ed1f45e0', 'e0554f1c-b98d-4031-86f3-0965ed1f45e0', '{"sub": "e0554f1c-b98d-4031-86f3-0965ed1f45e0", "email": "ai.petr@agewinners.com", "date_of_birth": "1981-05-05", "email_verified": true, "phone_verified": false}', 'email', '2026-04-13 07:14:33.925511+00', '2026-04-13 07:14:33.925561+00', '2026-04-13 07:14:33.925561+00', DEFAULT, 'ccdbb4e4-8290-48dc-8b7c-246cbb876a32');


--
-- TOC entry 4235 (class 0 OID 16518)
-- Dependencies: 356
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4249 (class 0 OID 17011)
-- Dependencies: 375
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4239 (class 0 OID 16757)
-- Dependencies: 365
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.sessions VALUES ('17d4d4e5-2ddb-450f-9f32-84dfc208b9a1', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', '2026-02-20 11:05:15.911689+00', '2026-02-20 11:05:15.911689+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '31.30.161.58', NULL, NULL, NULL, NULL, NULL);
INSERT INTO auth.sessions VALUES ('7ce6ad84-406b-40ae-8014-e25716dc36c5', 'f769233e-5132-4313-8ff6-5505b86791ed', '2026-02-08 10:41:10.075177+00', '2026-02-18 14:50:42.137517+00', NULL, 'aal1', NULL, '2026-02-18 14:50:42.137414', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '31.30.161.58', NULL, NULL, NULL, NULL, NULL);
INSERT INTO auth.sessions VALUES ('92823f6e-4780-4b27-a024-95c01984e2df', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', '2026-04-24 11:52:22.58302+00', '2026-04-24 12:51:48.797148+00', NULL, 'aal1', NULL, '2026-04-24 12:51:48.797061', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '31.30.161.58', NULL, NULL, NULL, NULL, NULL);
INSERT INTO auth.sessions VALUES ('dbc2d31f-3098-44d3-94ae-ced0994d4cd5', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', '2026-02-20 11:23:36.739214+00', '2026-02-20 11:23:36.739214+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '31.30.161.58', NULL, NULL, NULL, NULL, NULL);
INSERT INTO auth.sessions VALUES ('53faf64b-baae-4e48-9ade-9cfb3d7d7c0f', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', '2026-02-20 11:10:39.19681+00', '2026-02-20 16:32:54.133688+00', NULL, 'aal1', NULL, '2026-02-20 16:32:54.13295', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '31.30.161.58', NULL, NULL, NULL, NULL, NULL);
INSERT INTO auth.sessions VALUES ('f3b51880-13ec-4ee9-ab41-48fcaf1135c7', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', '2026-02-20 10:29:26.51491+00', '2026-02-20 10:29:26.51491+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '31.30.161.58', NULL, NULL, NULL, NULL, NULL);
INSERT INTO auth.sessions VALUES ('df57492d-f452-4e21-8a57-18fb6d118298', 'f769233e-5132-4313-8ff6-5505b86791ed', '2026-02-07 09:36:39.030673+00', '2026-02-07 09:36:39.030673+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '31.30.161.58', NULL, NULL, NULL, NULL, NULL);
INSERT INTO auth.sessions VALUES ('e7a1db88-ae8d-44b4-bfeb-9e1c5082f4c6', 'f769233e-5132-4313-8ff6-5505b86791ed', '2026-02-07 09:37:06.031118+00', '2026-02-07 09:37:06.031118+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '31.30.161.58', NULL, NULL, NULL, NULL, NULL);
INSERT INTO auth.sessions VALUES ('c27a8557-d161-4e6f-83e0-776a8e3ee43f', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', '2026-02-21 07:30:05.256433+00', '2026-02-21 09:40:48.800312+00', NULL, 'aal1', NULL, '2026-02-21 09:40:48.800204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '31.30.161.58', NULL, NULL, NULL, NULL, NULL);
INSERT INTO auth.sessions VALUES ('9694feff-16c4-476f-9e56-0cfad72e4dc0', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', '2026-02-21 09:43:00.853107+00', '2026-02-21 09:43:00.853107+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '31.30.161.58', NULL, NULL, NULL, NULL, NULL);
INSERT INTO auth.sessions VALUES ('6984f19b-db75-4af3-bbb6-a421bee6278e', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', '2026-04-11 06:31:10.799029+00', '2026-04-11 07:40:26.042612+00', NULL, 'aal1', NULL, '2026-04-11 07:40:26.042503', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '31.30.161.58', NULL, NULL, NULL, NULL, NULL);
INSERT INTO auth.sessions VALUES ('87384a09-6376-4fc1-8b55-6b9e4161d8b9', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', '2026-03-05 09:28:09.095688+00', '2026-03-05 12:22:43.20929+00', NULL, 'aal1', NULL, '2026-03-05 12:22:43.208558', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '146.241.67.109', NULL, NULL, NULL, NULL, NULL);
INSERT INTO auth.sessions VALUES ('729e7847-cc63-48f2-9dea-fb38e0125aba', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', '2026-03-05 13:10:41.703415+00', '2026-03-05 13:10:41.703415+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '146.241.67.109', NULL, NULL, NULL, NULL, NULL);
INSERT INTO auth.sessions VALUES ('68dfed48-0203-4783-b6f4-ade23c422cba', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', '2026-04-12 06:53:34.915243+00', '2026-04-12 06:53:34.915243+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '31.30.161.58', NULL, NULL, NULL, NULL, NULL);


--
-- TOC entry 4242 (class 0 OID 16816)
-- Dependencies: 368
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.mfa_amr_claims VALUES ('87384a09-6376-4fc1-8b55-6b9e4161d8b9', '2026-03-05 09:28:09.119851+00', '2026-03-05 09:28:09.119851+00', 'password', 'cbdac1c5-b5f6-4f5a-89eb-403d44402b68');
INSERT INTO auth.mfa_amr_claims VALUES ('729e7847-cc63-48f2-9dea-fb38e0125aba', '2026-03-05 13:10:41.79017+00', '2026-03-05 13:10:41.79017+00', 'password', 'dcd9a4fa-4b95-49d1-ae77-4fdc2de7c25b');
INSERT INTO auth.mfa_amr_claims VALUES ('df57492d-f452-4e21-8a57-18fb6d118298', '2026-02-07 09:36:39.033702+00', '2026-02-07 09:36:39.033702+00', 'password', 'a0195def-d1d4-4d1e-ad01-fb53b5d67660');
INSERT INTO auth.mfa_amr_claims VALUES ('e7a1db88-ae8d-44b4-bfeb-9e1c5082f4c6', '2026-02-07 09:37:06.041186+00', '2026-02-07 09:37:06.041186+00', 'password', '1206b1eb-0b3f-4e1e-9edf-247955bcc459');
INSERT INTO auth.mfa_amr_claims VALUES ('92823f6e-4780-4b27-a024-95c01984e2df', '2026-04-24 11:52:22.591454+00', '2026-04-24 11:52:22.591454+00', 'password', '87811e6e-38b4-42a3-a431-6bbd3c293d70');
INSERT INTO auth.mfa_amr_claims VALUES ('7ce6ad84-406b-40ae-8014-e25716dc36c5', '2026-02-08 10:41:10.08485+00', '2026-02-08 10:41:10.08485+00', 'password', '6aefa1a6-01a8-4937-9487-8445f172fe66');
INSERT INTO auth.mfa_amr_claims VALUES ('f3b51880-13ec-4ee9-ab41-48fcaf1135c7', '2026-02-20 10:29:26.558643+00', '2026-02-20 10:29:26.558643+00', 'password', '85fae3a3-0393-4ac3-88f5-8f52542b93b2');
INSERT INTO auth.mfa_amr_claims VALUES ('17d4d4e5-2ddb-450f-9f32-84dfc208b9a1', '2026-02-20 11:05:15.93848+00', '2026-02-20 11:05:15.93848+00', 'password', 'f279ff5f-61cf-4224-a16c-5310fe701ac6');
INSERT INTO auth.mfa_amr_claims VALUES ('53faf64b-baae-4e48-9ade-9cfb3d7d7c0f', '2026-02-20 11:10:39.203483+00', '2026-02-20 11:10:39.203483+00', 'password', 'bd5b4c7c-bbd7-4622-bdc5-90922613a268');
INSERT INTO auth.mfa_amr_claims VALUES ('dbc2d31f-3098-44d3-94ae-ced0994d4cd5', '2026-02-20 11:23:36.74196+00', '2026-02-20 11:23:36.74196+00', 'password', '2ac8cfea-bc79-49d5-b91f-0fa1eb079c46');
INSERT INTO auth.mfa_amr_claims VALUES ('c27a8557-d161-4e6f-83e0-776a8e3ee43f', '2026-02-21 07:30:05.260206+00', '2026-02-21 07:30:05.260206+00', 'password', '418138f5-7ca0-4a15-8ac0-49ce26f770e7');
INSERT INTO auth.mfa_amr_claims VALUES ('9694feff-16c4-476f-9e56-0cfad72e4dc0', '2026-02-21 09:43:00.858399+00', '2026-02-21 09:43:00.858399+00', 'password', 'e9964e49-7217-4900-94ed-7923a2a2f3fd');
INSERT INTO auth.mfa_amr_claims VALUES ('6984f19b-db75-4af3-bbb6-a421bee6278e', '2026-04-11 06:31:10.831445+00', '2026-04-11 06:31:10.831445+00', 'password', 'e2791589-c23b-4379-970d-36aa188c20ce');
INSERT INTO auth.mfa_amr_claims VALUES ('68dfed48-0203-4783-b6f4-ade23c422cba', '2026-04-12 06:53:34.944321+00', '2026-04-12 06:53:34.944321+00', 'password', 'd96561bc-f7a5-4671-9a1e-a9e100268895');


--
-- TOC entry 4240 (class 0 OID 16791)
-- Dependencies: 366
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4241 (class 0 OID 16804)
-- Dependencies: 367
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4250 (class 0 OID 17041)
-- Dependencies: 376
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4252 (class 0 OID 41242)
-- Dependencies: 406
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4251 (class 0 OID 17074)
-- Dependencies: 377
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4248 (class 0 OID 16979)
-- Dependencies: 374
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4234 (class 0 OID 16507)
-- Dependencies: 355
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 394, 'y23pkxfnwhdg', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', true, '2026-02-21 08:33:45.542433+00', '2026-02-21 09:40:48.733108+00', 'j67v3rv43nrl', 'c27a8557-d161-4e6f-83e0-776a8e3ee43f');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 396, 'ewowpmhbp525', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', false, '2026-02-21 09:40:48.765213+00', '2026-02-21 09:40:48.765213+00', 'y23pkxfnwhdg', 'c27a8557-d161-4e6f-83e0-776a8e3ee43f');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 398, 'we6srowdtzy2', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', false, '2026-02-21 09:43:00.85512+00', '2026-02-21 09:43:00.85512+00', NULL, '9694feff-16c4-476f-9e56-0cfad72e4dc0');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 336, 'vnfz4q7u4iqc', 'f769233e-5132-4313-8ff6-5505b86791ed', true, '2026-02-16 11:28:28.660421+00', '2026-02-18 14:50:42.108133+00', 'c5pdaietu55z', '7ce6ad84-406b-40ae-8014-e25716dc36c5');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 344, 'rkualsq4qtug', 'f769233e-5132-4313-8ff6-5505b86791ed', false, '2026-02-18 14:50:42.121425+00', '2026-02-18 14:50:42.121425+00', 'vnfz4q7u4iqc', '7ce6ad84-406b-40ae-8014-e25716dc36c5');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 305, 'ydsyunlnnaq4', 'f769233e-5132-4313-8ff6-5505b86791ed', false, '2026-02-07 09:36:39.032106+00', '2026-02-07 09:36:39.032106+00', NULL, 'df57492d-f452-4e21-8a57-18fb6d118298');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 306, 'w2rspxruvgkv', 'f769233e-5132-4313-8ff6-5505b86791ed', false, '2026-02-07 09:37:06.034448+00', '2026-02-07 09:37:06.034448+00', NULL, 'e7a1db88-ae8d-44b4-bfeb-9e1c5082f4c6');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 324, 'iwzukt6bxpag', 'f769233e-5132-4313-8ff6-5505b86791ed', true, '2026-02-08 10:41:10.08247+00', '2026-02-08 15:34:23.641428+00', NULL, '7ce6ad84-406b-40ae-8014-e25716dc36c5');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 326, 'yupolcko4evf', 'f769233e-5132-4313-8ff6-5505b86791ed', true, '2026-02-08 15:34:23.655818+00', '2026-02-08 16:36:11.625643+00', 'iwzukt6bxpag', '7ce6ad84-406b-40ae-8014-e25716dc36c5');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 364, 'bss7xjoojoaa', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', false, '2026-02-20 10:29:26.541149+00', '2026-02-20 10:29:26.541149+00', NULL, 'f3b51880-13ec-4ee9-ab41-48fcaf1135c7');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 328, 'heb3rxmwkb36', 'f769233e-5132-4313-8ff6-5505b86791ed', true, '2026-02-08 16:36:11.633298+00', '2026-02-16 09:20:04.47399+00', 'yupolcko4evf', '7ce6ad84-406b-40ae-8014-e25716dc36c5');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 333, '7chabsj6ppoj', 'f769233e-5132-4313-8ff6-5505b86791ed', true, '2026-02-16 09:20:04.490666+00', '2026-02-16 10:25:40.842167+00', 'heb3rxmwkb36', '7ce6ad84-406b-40ae-8014-e25716dc36c5');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 367, 'kjk7rsgnqkdq', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', false, '2026-02-20 11:05:15.925713+00', '2026-02-20 11:05:15.925713+00', NULL, '17d4d4e5-2ddb-450f-9f32-84dfc208b9a1');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 335, 'c5pdaietu55z', 'f769233e-5132-4313-8ff6-5505b86791ed', true, '2026-02-16 10:25:40.872832+00', '2026-02-16 11:28:28.630949+00', '7chabsj6ppoj', '7ce6ad84-406b-40ae-8014-e25716dc36c5');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 371, 'q4vwy3duxxnc', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', false, '2026-02-20 11:23:36.740454+00', '2026-02-20 11:23:36.740454+00', NULL, 'dbc2d31f-3098-44d3-94ae-ced0994d4cd5');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 368, 'sx2bj4s6jdkr', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', true, '2026-02-20 11:10:39.201197+00', '2026-02-20 16:32:54.110902+00', NULL, '53faf64b-baae-4e48-9ade-9cfb3d7d7c0f');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 373, 'k5ksuur2w3qj', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', false, '2026-02-20 16:32:54.119934+00', '2026-02-20 16:32:54.119934+00', 'sx2bj4s6jdkr', '53faf64b-baae-4e48-9ade-9cfb3d7d7c0f');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 390, 'j67v3rv43nrl', 'f4c293c0-31c7-4278-8ebd-7fb53d21a6c4', true, '2026-02-21 07:30:05.257686+00', '2026-02-21 08:33:45.541792+00', NULL, 'c27a8557-d161-4e6f-83e0-776a8e3ee43f');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 754, 'uz2q5nqrjvxq', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', true, '2026-04-24 11:52:22.590042+00', '2026-04-24 12:51:48.764846+00', NULL, '92823f6e-4780-4b27-a024-95c01984e2df');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 756, '2arccpd7gczp', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', false, '2026-04-24 12:51:48.779693+00', '2026-04-24 12:51:48.779693+00', 'uz2q5nqrjvxq', '92823f6e-4780-4b27-a024-95c01984e2df');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 447, 'dqhzmokhdpq6', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', true, '2026-03-05 09:28:09.115595+00', '2026-03-05 10:27:36.096895+00', NULL, '87384a09-6376-4fc1-8b55-6b9e4161d8b9');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 448, 'je3nfi3lb3xo', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', true, '2026-03-05 10:27:36.123595+00', '2026-03-05 12:22:43.137989+00', 'dqhzmokhdpq6', '87384a09-6376-4fc1-8b55-6b9e4161d8b9');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 449, 'emfgzma5szfb', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', false, '2026-03-05 12:22:43.164587+00', '2026-03-05 12:22:43.164587+00', 'je3nfi3lb3xo', '87384a09-6376-4fc1-8b55-6b9e4161d8b9');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 450, 'kapb7onipwv7', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', false, '2026-03-05 13:10:41.743768+00', '2026-03-05 13:10:41.743768+00', NULL, '729e7847-cc63-48f2-9dea-fb38e0125aba');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 662, 'rrxvk7mr5lz6', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', true, '2026-04-11 06:31:10.814869+00', '2026-04-11 07:40:26.008796+00', NULL, '6984f19b-db75-4af3-bbb6-a421bee6278e');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 664, 'zfhp4slmihrg', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', false, '2026-04-11 07:40:26.021471+00', '2026-04-11 07:40:26.021471+00', 'rrxvk7mr5lz6', '6984f19b-db75-4af3-bbb6-a421bee6278e');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 669, 'cujhwvr3cuvd', '498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a', false, '2026-04-12 06:53:34.932812+00', '2026-04-12 06:53:34.932812+00', NULL, '68dfed48-0203-4783-b6f4-ade23c422cba');


--
-- TOC entry 4243 (class 0 OID 16834)
-- Dependencies: 369
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4245 (class 0 OID 16858)
-- Dependencies: 371
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4246 (class 0 OID 16876)
-- Dependencies: 372
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4237 (class 0 OID 16533)
-- Dependencies: 358
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.schema_migrations VALUES ('20171026211738');
INSERT INTO auth.schema_migrations VALUES ('20171026211808');
INSERT INTO auth.schema_migrations VALUES ('20171026211834');
INSERT INTO auth.schema_migrations VALUES ('20180103212743');
INSERT INTO auth.schema_migrations VALUES ('20180108183307');
INSERT INTO auth.schema_migrations VALUES ('20180119214651');
INSERT INTO auth.schema_migrations VALUES ('20180125194653');
INSERT INTO auth.schema_migrations VALUES ('00');
INSERT INTO auth.schema_migrations VALUES ('20210710035447');
INSERT INTO auth.schema_migrations VALUES ('20210722035447');
INSERT INTO auth.schema_migrations VALUES ('20210730183235');
INSERT INTO auth.schema_migrations VALUES ('20210909172000');
INSERT INTO auth.schema_migrations VALUES ('20210927181326');
INSERT INTO auth.schema_migrations VALUES ('20211122151130');
INSERT INTO auth.schema_migrations VALUES ('20211124214934');
INSERT INTO auth.schema_migrations VALUES ('20211202183645');
INSERT INTO auth.schema_migrations VALUES ('20220114185221');
INSERT INTO auth.schema_migrations VALUES ('20220114185340');
INSERT INTO auth.schema_migrations VALUES ('20220224000811');
INSERT INTO auth.schema_migrations VALUES ('20220323170000');
INSERT INTO auth.schema_migrations VALUES ('20220429102000');
INSERT INTO auth.schema_migrations VALUES ('20220531120530');
INSERT INTO auth.schema_migrations VALUES ('20220614074223');
INSERT INTO auth.schema_migrations VALUES ('20220811173540');
INSERT INTO auth.schema_migrations VALUES ('20221003041349');
INSERT INTO auth.schema_migrations VALUES ('20221003041400');
INSERT INTO auth.schema_migrations VALUES ('20221011041400');
INSERT INTO auth.schema_migrations VALUES ('20221020193600');
INSERT INTO auth.schema_migrations VALUES ('20221021073300');
INSERT INTO auth.schema_migrations VALUES ('20221021082433');
INSERT INTO auth.schema_migrations VALUES ('20221027105023');
INSERT INTO auth.schema_migrations VALUES ('20221114143122');
INSERT INTO auth.schema_migrations VALUES ('20221114143410');
INSERT INTO auth.schema_migrations VALUES ('20221125140132');
INSERT INTO auth.schema_migrations VALUES ('20221208132122');
INSERT INTO auth.schema_migrations VALUES ('20221215195500');
INSERT INTO auth.schema_migrations VALUES ('20221215195800');
INSERT INTO auth.schema_migrations VALUES ('20221215195900');
INSERT INTO auth.schema_migrations VALUES ('20230116124310');
INSERT INTO auth.schema_migrations VALUES ('20230116124412');
INSERT INTO auth.schema_migrations VALUES ('20230131181311');
INSERT INTO auth.schema_migrations VALUES ('20230322519590');
INSERT INTO auth.schema_migrations VALUES ('20230402418590');
INSERT INTO auth.schema_migrations VALUES ('20230411005111');
INSERT INTO auth.schema_migrations VALUES ('20230508135423');
INSERT INTO auth.schema_migrations VALUES ('20230523124323');
INSERT INTO auth.schema_migrations VALUES ('20230818113222');
INSERT INTO auth.schema_migrations VALUES ('20230914180801');
INSERT INTO auth.schema_migrations VALUES ('20231027141322');
INSERT INTO auth.schema_migrations VALUES ('20231114161723');
INSERT INTO auth.schema_migrations VALUES ('20231117164230');
INSERT INTO auth.schema_migrations VALUES ('20240115144230');
INSERT INTO auth.schema_migrations VALUES ('20240214120130');
INSERT INTO auth.schema_migrations VALUES ('20240306115329');
INSERT INTO auth.schema_migrations VALUES ('20240314092811');
INSERT INTO auth.schema_migrations VALUES ('20240427152123');
INSERT INTO auth.schema_migrations VALUES ('20240612123726');
INSERT INTO auth.schema_migrations VALUES ('20240729123726');
INSERT INTO auth.schema_migrations VALUES ('20240802193726');
INSERT INTO auth.schema_migrations VALUES ('20240806073726');
INSERT INTO auth.schema_migrations VALUES ('20241009103726');
INSERT INTO auth.schema_migrations VALUES ('20250717082212');
INSERT INTO auth.schema_migrations VALUES ('20250731150234');
INSERT INTO auth.schema_migrations VALUES ('20250804100000');
INSERT INTO auth.schema_migrations VALUES ('20250901200500');
INSERT INTO auth.schema_migrations VALUES ('20250903112500');
INSERT INTO auth.schema_migrations VALUES ('20250904133000');
INSERT INTO auth.schema_migrations VALUES ('20250925093508');
INSERT INTO auth.schema_migrations VALUES ('20251007112900');
INSERT INTO auth.schema_migrations VALUES ('20251104100000');
INSERT INTO auth.schema_migrations VALUES ('20251111201300');
INSERT INTO auth.schema_migrations VALUES ('20251201000000');
INSERT INTO auth.schema_migrations VALUES ('20260115000000');
INSERT INTO auth.schema_migrations VALUES ('20260121000000');
INSERT INTO auth.schema_migrations VALUES ('20260219120000');
INSERT INTO auth.schema_migrations VALUES ('20260302000000');


--
-- TOC entry 4244 (class 0 OID 16843)
-- Dependencies: 370
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4255 (class 0 OID 149240)
-- Dependencies: 419
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4254 (class 0 OID 149217)
-- Dependencies: 418
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- TOC entry 4261 (class 0 OID 0)
-- Dependencies: 354
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 765, true);


-- Completed on 2026-04-27 19:43:03

--
-- PostgreSQL database dump complete
--

\unrestrict ut07hlt4jKUwKgpBYLWweiEfeRQJQSIkhmOS0GyPHcADN8SNTAheoQJwWL2jvkW

