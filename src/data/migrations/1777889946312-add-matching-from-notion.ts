import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
-- Seed opportunity_volunteer rows from Notion data
-- Statuses: opp-active > opp-matched > opp-pending (contacted)
-- Idempotent: skips if a row for (volunteer_id, opportunity_id) already exists

INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 1, 376, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 1 AND opportunity_id = 376
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 1, 513, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 1 AND opportunity_id = 513
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 1, 660, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 1 AND opportunity_id = 660
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 10, 62, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 10 AND opportunity_id = 62
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 10, 150, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 10 AND opportunity_id = 150
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 10, 154, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 10 AND opportunity_id = 154
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 10, 164, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 10 AND opportunity_id = 164
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 10, 166, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 10 AND opportunity_id = 166
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 10, 233, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 10 AND opportunity_id = 233
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 21, 21, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 21 AND opportunity_id = 21
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 26, 360, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 26 AND opportunity_id = 360
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 32, 61, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 32 AND opportunity_id = 61
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 32, 280, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 32 AND opportunity_id = 280
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 32, 387, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 32 AND opportunity_id = 387
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 32, 569, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 32 AND opportunity_id = 569
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 32, 684, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 32 AND opportunity_id = 684
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 34, 165, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 34 AND opportunity_id = 165
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 34, 269, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 34 AND opportunity_id = 269
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 34, 436, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 34 AND opportunity_id = 436
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 34, 520, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 34 AND opportunity_id = 520
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 41, 32, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 41 AND opportunity_id = 32
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 45, 388, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 45 AND opportunity_id = 388
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 48, 112, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 48 AND opportunity_id = 112
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 50, 112, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 50 AND opportunity_id = 112
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 59, 25, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 59 AND opportunity_id = 25
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 65, 63, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 65 AND opportunity_id = 63
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 67, 350, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 67 AND opportunity_id = 350
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 70, 487, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 70 AND opportunity_id = 487
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 70, 496, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 70 AND opportunity_id = 496
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 70, 690, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 70 AND opportunity_id = 690
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 82, 687, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 82 AND opportunity_id = 687
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 83, 85, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 83 AND opportunity_id = 85
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 83, 112, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 83 AND opportunity_id = 112
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 85, 612, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 85 AND opportunity_id = 612
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 85, 744, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 85 AND opportunity_id = 744
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 85, 770, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 85 AND opportunity_id = 770
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 97, 595, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 97 AND opportunity_id = 595
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 102, 492, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 102 AND opportunity_id = 492
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 113, 78, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 113 AND opportunity_id = 78
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 116, 57, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 116 AND opportunity_id = 57
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 117, 462, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 117 AND opportunity_id = 462
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 122, 343, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 122 AND opportunity_id = 343
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 126, 80, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 126 AND opportunity_id = 80
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 126, 207, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 126 AND opportunity_id = 207
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 126, 649, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 126 AND opportunity_id = 649
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 127, 237, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 127 AND opportunity_id = 237
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 127, 309, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 127 AND opportunity_id = 309
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 127, 449, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 127 AND opportunity_id = 449
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 127, 450, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 127 AND opportunity_id = 450
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 127, 675, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 127 AND opportunity_id = 675
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 128, 72, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 128 AND opportunity_id = 72
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 133, 22, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 133 AND opportunity_id = 22
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 137, 82, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 137 AND opportunity_id = 82
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 146, 743, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 146 AND opportunity_id = 743
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 156, 445, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 156 AND opportunity_id = 445
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 156, 736, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 156 AND opportunity_id = 736
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 156, 795, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 156 AND opportunity_id = 795
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 164, 210, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 164 AND opportunity_id = 210
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 169, 171, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 169 AND opportunity_id = 171
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 171, 162, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 171 AND opportunity_id = 162
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 171, 248, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 171 AND opportunity_id = 248
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 171, 258, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 171 AND opportunity_id = 258
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 171, 303, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 171 AND opportunity_id = 303
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 171, 699, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 171 AND opportunity_id = 699
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 172, 240, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 172 AND opportunity_id = 240
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 172, 360, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 172 AND opportunity_id = 360
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 175, 699, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 175 AND opportunity_id = 699
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 184, 512, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 184 AND opportunity_id = 512
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 186, 107, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 186 AND opportunity_id = 107
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 198, 395, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 198 AND opportunity_id = 395
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 200, 281, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 200 AND opportunity_id = 281
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 201, 573, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 201 AND opportunity_id = 573
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 202, 291, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 202 AND opportunity_id = 291
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 210, 617, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 210 AND opportunity_id = 617
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 211, 421, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 211 AND opportunity_id = 421
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 233, 562, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 233 AND opportunity_id = 562
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 233, 664, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 233 AND opportunity_id = 664
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 245, 130, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 245 AND opportunity_id = 130
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 249, 124, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 249 AND opportunity_id = 124
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 249, 146, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 249 AND opportunity_id = 146
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 253, 127, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 253 AND opportunity_id = 127
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 253, 175, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 253 AND opportunity_id = 175
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 254, 127, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 254 AND opportunity_id = 127
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 254, 175, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 254 AND opportunity_id = 175
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 254, 228, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 254 AND opportunity_id = 228
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 257, 180, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 257 AND opportunity_id = 180
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 257, 182, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 257 AND opportunity_id = 182
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 262, 183, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 262 AND opportunity_id = 183
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 268, 284, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 268 AND opportunity_id = 284
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 280, 594, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 280 AND opportunity_id = 594
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 281, 342, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 281 AND opportunity_id = 342
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 282, 138, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 282 AND opportunity_id = 138
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 285, 354, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 285 AND opportunity_id = 354
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 285, 511, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 285 AND opportunity_id = 511
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 285, 645, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 285 AND opportunity_id = 645
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 292, 155, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 292 AND opportunity_id = 155
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 294, 361, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 294 AND opportunity_id = 361
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 294, 510, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 294 AND opportunity_id = 510
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 294, 644, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 294 AND opportunity_id = 644
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 308, 124, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 308 AND opportunity_id = 124
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 309, 122, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 309 AND opportunity_id = 122
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 315, 211, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 315 AND opportunity_id = 211
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 317, 201, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 317 AND opportunity_id = 201
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 322, 249, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 322 AND opportunity_id = 249
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 322, 286, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 322 AND opportunity_id = 286
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 322, 386, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 322 AND opportunity_id = 386
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 322, 473, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 322 AND opportunity_id = 473
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 322, 504, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 322 AND opportunity_id = 504
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 322, 643, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 322 AND opportunity_id = 643
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 322, 769, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 322 AND opportunity_id = 769
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 322, 791, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 322 AND opportunity_id = 791
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 322, 800, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 322 AND opportunity_id = 800
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 330, 657, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 330 AND opportunity_id = 657
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 333, 383, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 333 AND opportunity_id = 383
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 334, 238, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 334 AND opportunity_id = 238
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 334, 345, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 334 AND opportunity_id = 345
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 334, 355, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 334 AND opportunity_id = 355
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 334, 475, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 334 AND opportunity_id = 475
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 334, 539, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 334 AND opportunity_id = 539
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 334, 546, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 334 AND opportunity_id = 546
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 334, 623, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 334 AND opportunity_id = 623
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 338, 235, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 338 AND opportunity_id = 235
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 339, 356, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 339 AND opportunity_id = 356
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 351, 631, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 351 AND opportunity_id = 631
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 357, 229, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 357 AND opportunity_id = 229
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 362, 236, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 362 AND opportunity_id = 236
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 362, 287, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 362 AND opportunity_id = 287
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 362, 402, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 362 AND opportunity_id = 402
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 362, 564, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 362 AND opportunity_id = 564
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 362, 615, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 362 AND opportunity_id = 615
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 362, 674, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 362 AND opportunity_id = 674
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 363, 496, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 363 AND opportunity_id = 496
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 363, 535, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 363 AND opportunity_id = 535
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 365, 251, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 365 AND opportunity_id = 251
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 365, 253, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 365 AND opportunity_id = 253
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 365, 282, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 365 AND opportunity_id = 282
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 365, 460, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 365 AND opportunity_id = 460
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 370, 322, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 370 AND opportunity_id = 322
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 374, 264, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 374 AND opportunity_id = 264
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 374, 317, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 374 AND opportunity_id = 317
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 377, 296, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 377 AND opportunity_id = 296
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 383, 313, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 383 AND opportunity_id = 313
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 385, 265, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 385 AND opportunity_id = 265
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 392, 341, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 392 AND opportunity_id = 341
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 398, 430, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 398 AND opportunity_id = 430
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 401, 260, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 401 AND opportunity_id = 260
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 401, 319, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 401 AND opportunity_id = 319
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 402, 239, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 402 AND opportunity_id = 239
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 403, 14, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 403 AND opportunity_id = 14
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 403, 218, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 403 AND opportunity_id = 218
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 403, 657, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 403 AND opportunity_id = 657
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 404, 262, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 404 AND opportunity_id = 262
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 409, 279, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 409 AND opportunity_id = 279
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 409, 316, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 409 AND opportunity_id = 316
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 411, 273, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 411 AND opportunity_id = 273
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 413, 734, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 413 AND opportunity_id = 734
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 415, 324, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 415 AND opportunity_id = 324
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 418, 239, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 418 AND opportunity_id = 239
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 419, 123, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 419 AND opportunity_id = 123
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 427, 571, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 427 AND opportunity_id = 571
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 433, 137, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 433 AND opportunity_id = 137
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 433, 570, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 433 AND opportunity_id = 570
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 434, 205, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 434 AND opportunity_id = 205
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 442, 814, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 442 AND opportunity_id = 814
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 447, 325, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 447 AND opportunity_id = 325
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 450, 363, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 450 AND opportunity_id = 363
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 458, 401, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 458 AND opportunity_id = 401
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 460, 217, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 460 AND opportunity_id = 217
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 461, 487, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 461 AND opportunity_id = 487
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 461, 496, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 461 AND opportunity_id = 496
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 462, 423, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 462 AND opportunity_id = 423
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 471, 12, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 471 AND opportunity_id = 12
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 471, 374, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 471 AND opportunity_id = 374
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 476, 423, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 476 AND opportunity_id = 423
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 476, 556, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 476 AND opportunity_id = 556
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 489, 406, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 489 AND opportunity_id = 406
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 497, 418, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 497 AND opportunity_id = 418
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 497, 523, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 497 AND opportunity_id = 523
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 497, 694, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 497 AND opportunity_id = 694
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 498, 455, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 498 AND opportunity_id = 455
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 498, 587, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 498 AND opportunity_id = 587
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 498, 638, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 498 AND opportunity_id = 638
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 498, 672, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 498 AND opportunity_id = 672
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 503, 423, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 503 AND opportunity_id = 423
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 504, 416, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 504 AND opportunity_id = 416
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 508, 328, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 508 AND opportunity_id = 328
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 509, 447, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 509 AND opportunity_id = 447
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 512, 589, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 512 AND opportunity_id = 589
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 514, 307, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 514 AND opportunity_id = 307
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 514, 442, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 514 AND opportunity_id = 442
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 530, 681, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 530 AND opportunity_id = 681
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 532, 415, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 532 AND opportunity_id = 415
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 535, 406, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 535 AND opportunity_id = 406
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 538, 553, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 538 AND opportunity_id = 553
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 538, 698, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 538 AND opportunity_id = 698
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 540, 527, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 540 AND opportunity_id = 527
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 540, 564, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 540 AND opportunity_id = 564
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 547, 413, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 547 AND opportunity_id = 413
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 549, 466, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 549 AND opportunity_id = 466
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 549, 467, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 549 AND opportunity_id = 467
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 549, 536, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 549 AND opportunity_id = 536
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 550, 482, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 550 AND opportunity_id = 482
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 553, 478, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 553 AND opportunity_id = 478
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 554, 601, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 554 AND opportunity_id = 601
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 556, 481, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 556 AND opportunity_id = 481
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 557, 478, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 557 AND opportunity_id = 478
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 559, 476, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 559 AND opportunity_id = 476
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 561, 472, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 561 AND opportunity_id = 472
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 566, 314, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 566 AND opportunity_id = 314
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 569, 728, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 569 AND opportunity_id = 728
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 570, 278, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 570 AND opportunity_id = 278
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 573, 480, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 573 AND opportunity_id = 480
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 580, 478, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 580 AND opportunity_id = 478
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 581, 613, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 581 AND opportunity_id = 613
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 583, 554, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 583 AND opportunity_id = 554
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 583, 752, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 583 AND opportunity_id = 752
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 589, 690, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 589 AND opportunity_id = 690
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 593, 428, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 593 AND opportunity_id = 428
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 594, 356, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 594 AND opportunity_id = 356
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 598, 478, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 598 AND opportunity_id = 478
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 599, 222, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 599 AND opportunity_id = 222
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 599, 631, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 599 AND opportunity_id = 631
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 600, 11, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 600 AND opportunity_id = 11
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 601, 575, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 601 AND opportunity_id = 575
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 603, 230, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 603 AND opportunity_id = 230
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 606, 222, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 606 AND opportunity_id = 222
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 614, 544, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 614 AND opportunity_id = 544
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 614, 648, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 614 AND opportunity_id = 648
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 614, 676, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 614 AND opportunity_id = 676
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 614, 717, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 614 AND opportunity_id = 717
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 615, 564, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 615 AND opportunity_id = 564
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 620, 588, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 620 AND opportunity_id = 588
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 624, 706, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 624 AND opportunity_id = 706
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 624, 712, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 624 AND opportunity_id = 712
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 631, 277, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 631 AND opportunity_id = 277
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 635, 360, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 635 AND opportunity_id = 360
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 642, 558, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 642 AND opportunity_id = 558
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 645, 515, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 645 AND opportunity_id = 515
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 645, 574, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 645 AND opportunity_id = 574
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 645, 580, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 645 AND opportunity_id = 580
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 645, 586, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 645 AND opportunity_id = 586
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 645, 606, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 645 AND opportunity_id = 606
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 645, 611, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 645 AND opportunity_id = 611
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 645, 636, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 645 AND opportunity_id = 636
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 645, 641, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 645 AND opportunity_id = 641
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 645, 655, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 645 AND opportunity_id = 655
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 645, 754, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 645 AND opportunity_id = 754
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 645, 765, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 645 AND opportunity_id = 765
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 649, 519, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 649 AND opportunity_id = 519
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 649, 618, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 649 AND opportunity_id = 618
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 649, 619, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 649 AND opportunity_id = 619
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 650, 3, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 650 AND opportunity_id = 3
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 653, 576, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 653 AND opportunity_id = 576
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 654, 700, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 654 AND opportunity_id = 700
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 655, 579, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 655 AND opportunity_id = 579
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 658, 256, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 658 AND opportunity_id = 256
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 662, 667, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 662 AND opportunity_id = 667
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 664, 175, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 664 AND opportunity_id = 175
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 669, 631, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 669 AND opportunity_id = 631
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 670, 271, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 670 AND opportunity_id = 271
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 673, 729, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 673 AND opportunity_id = 729
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 674, 577, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 674 AND opportunity_id = 577
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 675, 749, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 675 AND opportunity_id = 749
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 676, 517, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 676 AND opportunity_id = 517
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 677, 516, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 677 AND opportunity_id = 516
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 679, 619, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 679 AND opportunity_id = 619
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 681, 490, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 681 AND opportunity_id = 490
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 684, 469, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 684 AND opportunity_id = 469
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 685, 618, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 685 AND opportunity_id = 618
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 687, 543, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 687 AND opportunity_id = 543
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 691, 14, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 691 AND opportunity_id = 14
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 692, 639, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 692 AND opportunity_id = 639
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 693, 219, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 693 AND opportunity_id = 219
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 699, 577, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 699 AND opportunity_id = 577
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 700, 656, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 700 AND opportunity_id = 656
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 702, 522, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 702 AND opportunity_id = 522
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 703, 594, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 703 AND opportunity_id = 594
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 705, 658, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 705 AND opportunity_id = 658
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 705, 792, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 705 AND opportunity_id = 792
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 707, 634, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 707 AND opportunity_id = 634
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 711, 589, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 711 AND opportunity_id = 589
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 713, 577, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 713 AND opportunity_id = 577
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 715, 659, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 715 AND opportunity_id = 659
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 717, 652, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 717 AND opportunity_id = 652
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 719, 102, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 719 AND opportunity_id = 102
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 719, 708, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 719 AND opportunity_id = 708
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 721, 666, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 721 AND opportunity_id = 666
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 725, 560, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 725 AND opportunity_id = 560
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 728, 668, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 728 AND opportunity_id = 668
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 728, 728, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 728 AND opportunity_id = 728
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 729, 219, 'opp-active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 729 AND opportunity_id = 219
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 730, 621, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 730 AND opportunity_id = 621
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 735, 639, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 735 AND opportunity_id = 639
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 737, 610, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 737 AND opportunity_id = 610
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 738, 560, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 738 AND opportunity_id = 560
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 742, 602, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 742 AND opportunity_id = 602
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 743, 505, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 743 AND opportunity_id = 505
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 750, 682, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 750 AND opportunity_id = 682
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 751, 711, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 751 AND opportunity_id = 711
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 752, 616, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 752 AND opportunity_id = 616
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 753, 522, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 753 AND opportunity_id = 522
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 763, 584, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 763 AND opportunity_id = 584
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 765, 729, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 765 AND opportunity_id = 729
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 766, 14, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 766 AND opportunity_id = 14
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 766, 682, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 766 AND opportunity_id = 682
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 767, 538, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 767 AND opportunity_id = 538
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 769, 595, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 769 AND opportunity_id = 595
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 770, 430, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 770 AND opportunity_id = 430
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 776, 711, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 776 AND opportunity_id = 711
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 778, 217, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 778 AND opportunity_id = 217
);
INSERT INTO public.opportunity_volunteer (volunteer_id, opportunity_id, status)
SELECT 785, 616, 'opp-matched'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_volunteer
  WHERE volunteer_id = 785 AND opportunity_id = 616
);
`;

export class AddMatchingFromNotion1777889946312 implements MigrationInterface {
  name = "AddMatchingFromNotion1777889946312";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(sql);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
