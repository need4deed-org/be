import { AppDataSource } from "../../data/data-source";
import FieldTranslation from "../../data/entity/field_translation.entity";
import Postcode from "../../data/entity/location/postcode.entity";
import Timeslot from "../../data/entity/time/timeslot.entity";
import { TranslationEntityType } from "../../data/types";

export async function getPostcode(code: string): Promise<Postcode | null> {
  const postcodeRepository = AppDataSource.getRepository(Postcode);

  let postcode = await postcodeRepository.findOneBy({ value: code });

  if (!postcode) {
    postcode = new Postcode({ value: code });
    await postcodeRepository.save(postcode);
  }

  return postcode;
}

export async function getProfileEntityByTitle<
  E extends new (args: unknown) => { title: string; id: number },
  M extends object,
>(
  entityTitle: string,
  entityType: TranslationEntityType,
  entity: E,
  m2mEntity: new (args: unknown) => M,
  key?: keyof M,
): Promise<M | null> {
  const instance = await getInstanceByTranslation(
    entityTitle,
    entity,
    entityType,
  );

  if (instance) {
    const profileEntity = new m2mEntity({
      [key ? key : entityType.toLowerCase()]: instance,
    });

    return profileEntity;
  }

  return null;
}

export async function getTimeslot(
  timeslotData: Partial<Timeslot>,
): Promise<Timeslot> {
  const timeslotRepository = AppDataSource.getRepository(Timeslot);

  let timeslot = await timeslotRepository.findOneBy(timeslotData);
  if (!timeslot) {
    timeslot = new Timeslot(timeslotData);
  }

  return timeslot;
}

export async function getInstanceByTranslation<
  E extends new (args: unknown) => { id: number; title: string },
>(
  entityTitle: string,
  entity: E,
  entityType: TranslationEntityType,
): Promise<InstanceType<E> | null> {
  const repository = AppDataSource.getRepository(entity);
  let instance = await repository.findOneBy({ title: entityTitle });
  if (!instance && entityType !== TranslationEntityType.NONE) {
    const fieldTranslationRepository =
      AppDataSource.getRepository(FieldTranslation);

    const translation = await fieldTranslationRepository.findOne({
      where: {
        entityType: entityType,
        translation: entityTitle,
      },
    });
    if (translation) {
      instance = await repository.findOneBy({
        id: translation.entityId,
      });
    }
  }

  if (instance) {
    return instance as InstanceType<E>;
  }

  return null;
}
