import { MigrationInterface, QueryRunner } from "typeorm";

// OpportunityVolunteerStatusType values as of this migration — hardcoded (not
// imported from the SDK) so a later contract change can't retroactively alter
// what this historical seed writes / which statuses it preserves.
const STATUS_MATCHED = "opp-matched";
const STATUS_ACTIVE = "opp-active";
const STATUS_PAST = "opp-past";

// [volunteerId, opportunityId] — extracted from VOLVO-<id> / VOL-<id>
const MATCHED_PAIRS: [number, number][] = [
  [377, 847],
  [755, 841],
  [114, 831],
  [447, 828],
  [375, 826],
  [804, 826],
  [271, 825],
  [325, 809],
  [325, 803],
  [817, 808],
  [451, 808],
  [356, 797],
  [673, 787],
  [805, 779],
  [805, 16],
  [449, 779],
  [430, 765],
  [430, 825],
  [33, 754],
  [400, 753],
  [414, 749],
  [434, 748],
  [440, 748],
  [423, 748],
  [435, 736],
  [394, 736],
  [348, 733],
  [405, 731],
  [302, 728],
  [302, 720],
  [370, 728],
  [58, 728],
  [429, 717],
  [379, 715],
  [387, 714],
  [826, 712],
  [452, 712],
  [283, 709],
  [437, 706],
  [442, 698],
  [369, 692],
  [738, 691],
  [808, 691],
  [411, 690],
  [521, 690],
  [214, 685],
  [418, 685],
  [462, 680],
  [357, 675],
  [417, 673],
  [401, 673],
  [376, 673],
  [354, 672],
  [303, 671],
  [626, 669],
  [129, 667],
  [65, 660],
  [65, 287],
  [438, 656],
  [426, 656],
  [242, 649],
  [389, 639],
  [806, 634],
  [409, 618],
  [455, 618],
  [350, 615],
  [350, 715],
  [378, 613],
  [380, 612],
  [443, 601],
  [683, 588],
  [385, 586],
  [277, 576],
  [299, 574],
  [282, 574],
  [386, 565],
  [99, 523],
  [809, 523],
  [295, 520],
  [178, 515],
  [178, 652],
  [178, 479],
  [205, 515],
  [164, 515],
  [234, 507],
  [308, 506],
  [686, 497],
  [191, 496],
  [238, 496],
  [161, 491],
  [588, 485],
  [67, 479],
  [67, 631],
  [163, 465],
  [163, 479],
  [173, 465],
  [171, 465],
  [151, 451],
  [21, 448],
  [533, 446],
  [549, 445],
  [763, 445],
  [337, 445],
  [40, 441],
  [297, 441],
  [700, 435],
  [613, 427],
  [613, 436],
  [94, 425],
  [210, 410],
  [351, 4],
  [149, 395],
  [74, 392],
  [101, 389],
  [110, 386],
  [110, 339],
  [266, 384],
  [217, 374],
  [762, 370],
  [595, 37],
  [81, 361],
  [674, 356],
  [507, 346],
  [69, 343],
  [658, 342],
  [272, 338],
  [333, 337],
  [333, 720],
  [113, 333],
  [373, 331],
  [7, 323],
  [77, 322],
  [77, 387],
  [361, 313],
  [25, 302],
  [25, 348],
  [527, 296],
  [527, 295],
  [527, 439],
  [37, 290],
  [37, 429],
  [697, 271],
  [697, 464],
  [309, 270],
  [428, 267],
  [395, 267],
  [107, 266],
  [107, 754],
  [819, 265],
  [162, 265],
  [19, 257],
  [612, 253],
  [712, 24],
  [476, 239],
  [291, 235],
  [291, 787],
  [97, 235],
  [499, 218],
  [366, 207],
  [620, 206],
  [751, 202],
  [494, 200],
  [735, 196],
  [735, 329],
  [735, 616],
  [718, 192],
  [718, 448],
  [741, 192],
  [741, 193],
  [741, 301],
  [741, 315],
  [741, 368],
  [474, 190],
  [472, 186],
  [615, 185],
  [615, 181],
  [615, 195],
  [615, 197],
  [609, 176],
  [391, 16],
  [676, 150],
  [493, 146],
  [493, 207],
  [662, 146],
  [662, 207],
  [122, 142],
  [174, 13],
  [301, 12],
  [421, 116],
];

// An existing matched/active/past row is authoritative — never downgrade it.
const SKIP_STATUSES = [STATUS_MATCHED, STATUS_ACTIVE, STATUS_PAST];

const MATCHED = STATUS_MATCHED;

export class SeedMatchedOppVol1779739039589 implements MigrationInterface {
  name = "SeedMatchedOppVol1779739039589";

  // For each (opportunity, volunteer) pair, ensure a matched row exists:
  //   - no row yet                       -> INSERT a matched row
  //   - row exists at pending            -> UPDATE it to matched
  //   - row exists at matched/active/past -> left untouched (ON CONFLICT guard)
  // Pairs whose opportunity or volunteer no longer exists are skipped (the JOINs
  // drop them) so a stale reference can't fail the deploy. Relies on the
  // UNIQUE (opportunity_id, volunteer_id) constraint. Safe to re-run.
  public async up(queryRunner: QueryRunner): Promise<void> {
    const values = MATCHED_PAIRS.map(
      ([volunteerId, opportunityId]) => `(${opportunityId}, ${volunteerId})`,
    ).join(",\n        ");

    const skipList = SKIP_STATUSES.map((status) => `'${status}'`).join(", ");

    await queryRunner.query(`
      INSERT INTO opportunity_volunteer (opportunity_id, volunteer_id, status)
      SELECT p.opportunity_id, p.volunteer_id, '${MATCHED}'
      FROM (
        VALUES
        ${values}
      ) AS p(opportunity_id, volunteer_id)
      JOIN opportunity o ON o.id = p.opportunity_id
      JOIN volunteer v ON v.id = p.volunteer_id
      ON CONFLICT (opportunity_id, volunteer_id)
      DO UPDATE SET status = '${MATCHED}', updated_at = now()
      WHERE opportunity_volunteer.status NOT IN (${skipList});
    `);
  }

  // Data seed — prior per-row statuses are not recorded, so no automatic rollback.
  public async down(): Promise<void> {}
}
