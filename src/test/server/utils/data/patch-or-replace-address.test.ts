import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../../data/data-source";
import Address from "../../../../data/entity/location/address.entity";
import Postcode from "../../../../data/entity/location/postcode.entity";
import Person from "../../../../data/entity/person.entity";
import { getRepository } from "../../../../data/utils";
import { patchOrReplaceAddress } from "../../../../server/utils/data/for-routes";
import { randomNumericSuffix } from "../../../random";
import { firstSeeded } from "../../../seeded";
import { captureSql } from "../../../sql-capture";

describe("patchOrReplaceAddress lock order", () => {
  const createdAddressIds: number[] = [];

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  });

  afterAll(async () => {
    for (const id of createdAddressIds) {
      await getRepository(dataSource, Address).delete({ id });
    }
  });

  it("locks the Person row before the Address row inside a transaction", async () => {
    const postcode = await firstSeeded(getRepository(dataSource, Postcode));
    const address = await getRepository(dataSource, Address).save(
      new Address({ street: "Lock Order St", postcodeId: postcode.id }),
    );
    createdAddressIds.push(address.id);
    const person = await getRepository(dataSource, Person).save(
      new Person({
        firstName: "LockOrder",
        lastName: `Test-${randomNumericSuffix()}`,
        addressId: address.id,
      }),
    );

    const queries = await dataSource.transaction((manager) =>
      captureSql(() =>
        patchOrReplaceAddress(
          person.id,
          { id: address.id },
          { id: postcode.id },
          manager,
        ),
      ),
    );

    const lockOn = (table: string) =>
      queries.findIndex(
        (sql) =>
          new RegExp(`FROM (?:"[^"]+"\\.)?"${table}"`).test(sql) &&
          sql.includes("FOR UPDATE"),
      );
    expect(lockOn("person")).toBeGreaterThanOrEqual(0);
    expect(lockOn("address")).toBeGreaterThan(lockOn("person"));
  });
});
