import { PrimaryColumn, ViewColumn, ViewEntity } from "typeorm";

// Define the necessary enums if they are used as column types
// For simplicity, we'll use string/number types here.

@ViewEntity({
  name: "volunteer_list_mv", // IMPORTANT: Must match your MV name
  expression: `SELECT * FROM volunteer_list_mv`,
  synchronize: false,
})
export default class VolunteerListMV {
  // Primary key for TypeORM (essential for REFRESH CONCURRENTLY)
  @PrimaryColumn({ name: "volunteer_id" })
  id: number;

  // Columns needed for the final API response object (Step 1 output)
  @ViewColumn({ name: "full_name" })
  name: string;

  @ViewColumn({ name: "avatar_url" })
  avatarUrl: string; // Must be added to the MV SELECT statement

  @ViewColumn()
  status: string; // Mapped to v.status (use your VolunteerStateType if available)

  // Columns needed for internal filtering only
  @ViewColumn({ name: "volunteer_type" })
  volunteerType: string;

  @ViewColumn({ name: "language_ids_array" })
  languageIds: number[];

  @ViewColumn({ name: "has_german_language" })
  hasGerman: boolean;

  @ViewColumn({ name: "district_ids_array" })
  districtIds: number[];

  // Note: 'search_vector' is omitted as it's for internal DB use.
}
