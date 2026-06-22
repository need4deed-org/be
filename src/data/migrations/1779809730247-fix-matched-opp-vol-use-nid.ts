import { MigrationInterface, QueryRunner } from "typeorm";

// Pairs as [volunteerNid, opportunityNid] — these are the nid values stored on
// the volunteer and opportunity tables (e.g. volunteer.nid = 'VOLVO-377'),
// NOT the integer primary keys.  The previous migration (1779739039589) used
// the raw numbers extracted from the nid strings as integer IDs, which was
// wrong: the database auto-assigned integer IDs have no relation to those
// numbers.  This migration:
//   1. Deletes the wrong rows created by the previous migration (wrong integer
//      ID pairs that matched random volunteers to random opportunities).
//   2. Inserts the correct rows by joining on the nid column.

// The wrong integer pairs inserted by 1779739039589 — [opportunityId, volunteerId]
// (note: the previous migration mapped [volunteerId, opportunityId] → VALUES(oppId, volId))
const WRONG_INT_PAIRS: [number, number][] = [
  [847, 377], [841, 755], [831, 114], [828, 447], [826, 375], [826, 804],
  [825, 271], [809, 325], [803, 325], [808, 817], [808, 451], [797, 356],
  [787, 673], [779, 805], [16, 805],  [779, 449], [765, 430], [825, 430],
  [754, 33],  [753, 400], [749, 414], [748, 434], [748, 440], [748, 423],
  [736, 435], [736, 394], [733, 348], [731, 405], [728, 302], [720, 302],
  [728, 370], [728, 58],  [717, 429], [715, 379], [714, 387], [712, 826],
  [712, 452], [709, 283], [706, 437], [698, 442], [692, 369], [691, 738],
  [691, 808], [690, 411], [690, 521], [685, 214], [685, 418], [680, 462],
  [675, 357], [673, 417], [673, 401], [673, 376], [672, 354], [671, 303],
  [669, 626], [667, 129], [660, 65],  [287, 65],  [656, 438], [656, 426],
  [649, 242], [639, 389], [634, 806], [618, 409], [618, 455], [615, 350],
  [715, 350], [613, 378], [612, 380], [601, 443], [588, 683], [586, 385],
  [576, 277], [574, 299], [574, 282], [565, 386], [523, 99],  [523, 809],
  [520, 295], [515, 178], [652, 178], [479, 178], [515, 205], [515, 164],
  [507, 234], [506, 308], [497, 686], [496, 191], [496, 238], [491, 161],
  [485, 588], [479, 67],  [631, 67],  [465, 163], [479, 163], [465, 173],
  [465, 171], [451, 151], [448, 21],  [446, 533], [445, 549], [445, 763],
  [445, 337], [441, 40],  [441, 297], [435, 700], [427, 613], [436, 613],
  [425, 94],  [410, 210], [4, 351],   [395, 149], [392, 74],  [389, 101],
  [386, 110], [339, 110], [384, 266], [374, 217], [370, 762], [37, 595],
  [361, 81],  [356, 674], [346, 507], [343, 69],  [342, 658], [338, 272],
  [337, 333], [720, 333], [333, 113], [331, 373], [323, 7],   [322, 77],
  [387, 77],  [313, 361], [302, 25],  [348, 25],  [296, 527], [295, 527],
  [439, 527], [290, 37],  [429, 37],  [271, 697], [464, 697], [270, 309],
  [267, 428], [267, 395], [266, 107], [754, 107], [265, 819], [265, 162],
  [257, 19],  [253, 612], [24, 712],  [239, 476], [235, 291], [787, 291],
  [235, 97],  [218, 499], [207, 366], [206, 620], [202, 751], [200, 494],
  [196, 735], [329, 735], [616, 735], [192, 718], [448, 718], [192, 741],
  [193, 741], [301, 741], [315, 741], [368, 741], [190, 474], [186, 472],
  [185, 615], [181, 615], [195, 615], [197, 615], [176, 609], [16, 391],
  [150, 676], [146, 493], [207, 493], [146, 662], [207, 662], [142, 122],
  [13, 174],  [12, 301],  [116, 421],
];
const MATCHED_PAIRS: [string, string][] = [
  ["VOLVO-377", "VOL-847"],
  ["VOLVO-755", "VOL-841"],
  ["VOLVO-114", "VOL-831"],
  ["VOLVO-447", "VOL-828"],
  ["VOLVO-375", "VOL-826"],
  ["VOLVO-804", "VOL-826"],
  ["VOLVO-271", "VOL-825"],
  ["VOLVO-325", "VOL-809"],
  ["VOLVO-325", "VOL-803"],
  ["VOLVO-817", "VOL-808"],
  ["VOLVO-451", "VOL-808"],
  ["VOLVO-356", "VOL-797"],
  ["VOLVO-673", "VOL-787"],
  ["VOLVO-805", "VOL-779"],
  ["VOLVO-805", "VOL-16"],
  ["VOLVO-449", "VOL-779"],
  ["VOLVO-430", "VOL-765"],
  ["VOLVO-430", "VOL-825"],
  ["VOLVO-33",  "VOL-754"],
  ["VOLVO-400", "VOL-753"],
  ["VOLVO-414", "VOL-749"],
  ["VOLVO-434", "VOL-748"],
  ["VOLVO-440", "VOL-748"],
  ["VOLVO-423", "VOL-748"],
  ["VOLVO-435", "VOL-736"],
  ["VOLVO-394", "VOL-736"],
  ["VOLVO-348", "VOL-733"],
  ["VOLVO-405", "VOL-731"],
  ["VOLVO-302", "VOL-728"],
  ["VOLVO-302", "VOL-720"],
  ["VOLVO-370", "VOL-728"],
  ["VOLVO-58",  "VOL-728"],
  ["VOLVO-429", "VOL-717"],
  ["VOLVO-379", "VOL-715"],
  ["VOLVO-387", "VOL-714"],
  ["VOLVO-826", "VOL-712"],
  ["VOLVO-452", "VOL-712"],
  ["VOLVO-283", "VOL-709"],
  ["VOLVO-437", "VOL-706"],
  ["VOLVO-442", "VOL-698"],
  ["VOLVO-369", "VOL-692"],
  ["VOLVO-738", "VOL-691"],
  ["VOLVO-808", "VOL-691"],
  ["VOLVO-411", "VOL-690"],
  ["VOLVO-521", "VOL-690"],
  ["VOLVO-214", "VOL-685"],
  ["VOLVO-418", "VOL-685"],
  ["VOLVO-462", "VOL-680"],
  ["VOLVO-357", "VOL-675"],
  ["VOLVO-417", "VOL-673"],
  ["VOLVO-401", "VOL-673"],
  ["VOLVO-376", "VOL-673"],
  ["VOLVO-354", "VOL-672"],
  ["VOLVO-303", "VOL-671"],
  ["VOLVO-626", "VOL-669"],
  ["VOLVO-129", "VOL-667"],
  ["VOLVO-65",  "VOL-660"],
  ["VOLVO-65",  "VOL-287"],
  ["VOLVO-438", "VOL-656"],
  ["VOLVO-426", "VOL-656"],
  ["VOLVO-242", "VOL-649"],
  ["VOLVO-389", "VOL-639"],
  ["VOLVO-806", "VOL-634"],
  ["VOLVO-409", "VOL-618"],
  ["VOLVO-455", "VOL-618"],
  ["VOLVO-350", "VOL-615"],
  ["VOLVO-350", "VOL-715"],
  ["VOLVO-378", "VOL-613"],
  ["VOLVO-380", "VOL-612"],
  ["VOLVO-443", "VOL-601"],
  ["VOLVO-683", "VOL-588"],
  ["VOLVO-385", "VOL-586"],
  ["VOLVO-277", "VOL-576"],
  ["VOLVO-299", "VOL-574"],
  ["VOLVO-282", "VOL-574"],
  ["VOLVO-386", "VOL-565"],
  ["VOLVO-99",  "VOL-523"],
  ["VOLVO-809", "VOL-523"],
  ["VOLVO-295", "VOL-520"],
  ["VOLVO-178", "VOL-515"],
  ["VOLVO-178", "VOL-652"],
  ["VOLVO-178", "VOL-479"],
  ["VOLVO-205", "VOL-515"],
  ["VOLVO-164", "VOL-515"],
  ["VOLVO-234", "VOL-507"],
  ["VOLVO-308", "VOL-506"],
  ["VOLVO-686", "VOL-497"],
  ["VOLVO-191", "VOL-496"],
  ["VOLVO-238", "VOL-496"],
  ["VOLVO-161", "VOL-491"],
  ["VOLVO-588", "VOL-485"],
  ["VOLVO-67",  "VOL-479"],
  ["VOLVO-67",  "VOL-631"],
  ["VOLVO-163", "VOL-465"],
  ["VOLVO-163", "VOL-479"],
  ["VOLVO-173", "VOL-465"],
  ["VOLVO-171", "VOL-465"],
  ["VOLVO-151", "VOL-451"],
  ["VOLVO-21",  "VOL-448"],
  ["VOLVO-533", "VOL-446"],
  ["VOLVO-549", "VOL-445"],
  ["VOLVO-763", "VOL-445"],
  ["VOLVO-337", "VOL-445"],
  ["VOLVO-40",  "VOL-441"],
  ["VOLVO-297", "VOL-441"],
  ["VOLVO-700", "VOL-435"],
  ["VOLVO-613", "VOL-427"],
  ["VOLVO-613", "VOL-436"],
  ["VOLVO-94",  "VOL-425"],
  ["VOLVO-210", "VOL-410"],
  ["VOLVO-351", "VOL-4"],
  ["VOLVO-149", "VOL-395"],
  ["VOLVO-74",  "VOL-392"],
  ["VOLVO-101", "VOL-389"],
  ["VOLVO-110", "VOL-386"],
  ["VOLVO-110", "VOL-339"],
  ["VOLVO-266", "VOL-384"],
  ["VOLVO-217", "VOL-374"],
  ["VOLVO-762", "VOL-370"],
  ["VOLVO-595", "VOL-37"],
  ["VOLVO-81",  "VOL-361"],
  ["VOLVO-674", "VOL-356"],
  ["VOLVO-507", "VOL-346"],
  ["VOLVO-69",  "VOL-343"],
  ["VOLVO-658", "VOL-342"],
  ["VOLVO-272", "VOL-338"],
  ["VOLVO-333", "VOL-337"],
  ["VOLVO-333", "VOL-720"],
  ["VOLVO-113", "VOL-333"],
  ["VOLVO-373", "VOL-331"],
  ["VOLVO-7",   "VOL-323"],
  ["VOLVO-77",  "VOL-322"],
  ["VOLVO-77",  "VOL-387"],
  ["VOLVO-361", "VOL-313"],
  ["VOLVO-25",  "VOL-302"],
  ["VOLVO-25",  "VOL-348"],
  ["VOLVO-527", "VOL-296"],
  ["VOLVO-527", "VOL-295"],
  ["VOLVO-527", "VOL-439"],
  ["VOLVO-37",  "VOL-290"],
  ["VOLVO-37",  "VOL-429"],
  ["VOLVO-697", "VOL-271"],
  ["VOLVO-697", "VOL-464"],
  ["VOLVO-309", "VOL-270"],
  ["VOLVO-428", "VOL-267"],
  ["VOLVO-395", "VOL-267"],
  ["VOLVO-107", "VOL-266"],
  ["VOLVO-107", "VOL-754"],
  ["VOLVO-819", "VOL-265"],
  ["VOLVO-162", "VOL-265"],
  ["VOLVO-19",  "VOL-257"],
  ["VOLVO-612", "VOL-253"],
  ["VOLVO-712", "VOL-24"],
  ["VOLVO-476", "VOL-239"],
  ["VOLVO-291", "VOL-235"],
  ["VOLVO-291", "VOL-787"],
  ["VOLVO-97",  "VOL-235"],
  ["VOLVO-499", "VOL-218"],
  ["VOLVO-366", "VOL-207"],
  ["VOLVO-620", "VOL-206"],
  ["VOLVO-751", "VOL-202"],
  ["VOLVO-494", "VOL-200"],
  ["VOLVO-735", "VOL-196"],
  ["VOLVO-735", "VOL-329"],
  ["VOLVO-735", "VOL-616"],
  ["VOLVO-718", "VOL-192"],
  ["VOLVO-718", "VOL-448"],
  ["VOLVO-741", "VOL-192"],
  ["VOLVO-741", "VOL-193"],
  ["VOLVO-741", "VOL-301"],
  ["VOLVO-741", "VOL-315"],
  ["VOLVO-741", "VOL-368"],
  ["VOLVO-474", "VOL-190"],
  ["VOLVO-472", "VOL-186"],
  ["VOLVO-615", "VOL-185"],
  ["VOLVO-615", "VOL-181"],
  ["VOLVO-615", "VOL-195"],
  ["VOLVO-615", "VOL-197"],
  ["VOLVO-609", "VOL-176"],
  ["VOLVO-391", "VOL-16"],
  ["VOLVO-676", "VOL-150"],
  ["VOLVO-493", "VOL-146"],
  ["VOLVO-493", "VOL-207"],
  ["VOLVO-662", "VOL-146"],
  ["VOLVO-662", "VOL-207"],
  ["VOLVO-122", "VOL-142"],
  ["VOLVO-174", "VOL-13"],
  ["VOLVO-301", "VOL-12"],
  ["VOLVO-421", "VOL-116"],
];

export class FixMatchedOppVolUseNid1779809730247 implements MigrationInterface {
  name = "FixMatchedOppVolUseNid1779809730247";

  // Step 1: delete the wrong rows written by migration 1779739039589.
  // Step 2: insert the correct rows by joining on nid.
  // Safe to re-run (idempotent).
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Remove the wrongly-created pairs ───────────────────────────────
    // These are rows that were inserted with raw integer IDs mistakenly
    // extracted from the nid strings.  Only remove them if they are still
    // opp-matched (never touch active/past rows — those are authoritative).
    const wrongValues = WRONG_INT_PAIRS.map(
      ([oppId, volId]) => `(${oppId}, ${volId})`,
    ).join(", ");

    await queryRunner.query(`
      DELETE FROM opportunity_volunteer
      WHERE (opportunity_id, volunteer_id) IN (${wrongValues})
        AND status = 'opp-matched';
    `);

    // ── 2. Insert the correct pairs via nid join ───────────────────────────
    const correctValues = MATCHED_PAIRS.map(
      ([volNid, oppNid]) => `('${volNid}', '${oppNid}')`,
    ).join(",\n        ");

    await queryRunner.query(`
      INSERT INTO opportunity_volunteer (opportunity_id, volunteer_id, status)
      SELECT o.id, v.id, 'opp-matched'
      FROM (
        VALUES
        ${correctValues}
      ) AS p(vol_nid, opp_nid)
      JOIN volunteer   v ON v.nid = p.vol_nid
      JOIN opportunity o ON o.nid = p.opp_nid
      ON CONFLICT (opportunity_id, volunteer_id)
      DO UPDATE SET status = 'opp-matched', updated_at = now()
      WHERE opportunity_volunteer.status NOT IN ('opp-matched', 'opp-active', 'opp-past');
    `);
  }

  public async down(): Promise<void> {}
}
