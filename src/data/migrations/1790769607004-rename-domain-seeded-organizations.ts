import { MigrationInterface, QueryRunner } from "typeorm";

// be#1061: SeedOrganizationFromAgentDomains1786109950000 seeded operator
// (Träger) titles verbatim from email domains (e.g. "drk-berlin.de"), which
// is what the Operator picker shows. This renames them to human-readable
// names, hand-curated per domain as a first pass — staff still fix any
// remaining naming via PATCH /organization/:id.
//
// Only rows whose title is still the raw domain are touched, so anything
// staff already renamed is left alone. A rename is skipped (and logged) if
// another organization already has the target title (title is unique).
// The domain moves into `website` when that's empty, so it isn't lost.
//
// A few seeded domains are the same organization twice (a typo, an alias
// domain). Those are merged first: agents pointing at the alias are moved to
// the canonical row, and the alias row is deleted.
//
// Self-contained: raw SQL + hardcoded literals, no entities/app helpers.
export const ORGANIZATION_DOMAIN_ALIASES: [alias: string, canonical: string][] =
  [
    ["house-of-resouces.berlin", "house-of-resources.berlin"],
    ["city54hotel.de", "city54.de"],
    ["ba-mh.verwalt-berlin.de", "ba-mh.berlin.de"],
    ["mimev.de", "mim-ev.de"],
  ];

export const ORGANIZATION_TITLES_BY_DOMAIN: [domain: string, title: string][] =
  [
    ["adas-berlin.de", "ADAS Berlin"],
    ["afghanistankomitee.de", "Afghanistan-Komitee"],
    ["agens-berlin.de", "AGENS Berlin"],
    ["ag-spas.de", "AG SPAS"],
    ["akademie.org", "Akademie"],
    ["aktion-fh.de", "Aktion FH"],
    ["albatrosggmbh.de", "Albatros gGmbH"],
    ["alecsa-hotel.de", "Alecsa Hotel"],
    ["alep-ev.de", "ALEP e.V."],
    ["alt-hsh.de", "Alt-Hohenschönhausen"],
    ["amaroforo.de", "Amaro Foro e.V."],
    ["amuberlin.de", "AMU Berlin"],
    ["arrivalsupport.berlin", "Arrival Support Berlin"],
    ["artivisten.org", "Artivisten"],
    ["ash-berlin.eu", "Alice Salomon Hochschule Berlin"],
    ["ask-dogan.de", "Ask Dogan"],
    ["ausbildung-ota.de", "Ausbildung OTA"],
    ["awo-mitte.de", "AWO Berlin Mitte"],
    ["awo-spree-wuhle.de", "AWO Berlin Spree-Wuhle"],
    ["baff-zentren.org", "BAfF e.V."],
    ["ba-fk.berlin.de", "Bezirksamt Friedrichshain-Kreuzberg"],
    ["bagfa.de", "bagfa e.V."],
    ["ba-mh.berlin.de", "Bezirksamt Marzahn-Hellersdorf"],
    ["ba-mitte.berlin.de", "Bezirksamt Mitte"],
    ["ba-spandau.berlin.de", "Bezirksamt Spandau"],
    ["ba-sz.berlin.de", "Bezirksamt Steglitz-Zehlendorf"],
    ["ba-tk.berlin.de", "Bezirksamt Treptow-Köpenick"],
    ["ba-ts.berlin.de", "Bezirksamt Tempelhof-Schöneberg"],
    ["b-b-e.de", "Bundesnetzwerk Bürgerschaftliches Engagement (BBE)"],
    ["bdb-germany.de", "BDB Germany"],
    ["bedcon.net", "BedCon"],
    ["begspo.de", "BEGSPO"],
    ["benn-altglienicke.de", "BENN Altglienicke"],
    ["benn-blumbergerdamm.de", "BENN Blumberger Damm"],
    ["benn-buch.de", "BENN Buch"],
    ["bennimmv.de", "BENN im Märkischen Viertel"],
    ["benn-tegelsued.de", "BENN Tegel-Süd"],
    ["beratungsnetz-migration.de", "Beratungsnetz Migration"],
    ["berlin-aidshilfe.de", "Berliner Aids-Hilfe e.V."],
    ["berliner-stadtmission.de", "Berliner Stadtmission"],
    ["berlin-hilft.com", "Berlin hilft"],
    ["berlintoborders.org", "Berlin to Borders"],
    ["bethania.de", "Bethania"],
    ["bezirksamt-neukoelln.de", "Bezirksamt Neukölln"],
    ["bildungsmarkt.de", "Bildungsmarkt e.V."],
    [
      "bmbfsfjservice.bund.de",
      "Bundesministerium für Bildung, Familie, Senioren, Frauen und Jugend",
    ],
    ["bona-peiser.de", "Bona Peiser"],
    ["boulevard-kastanienallee.de", "Boulevard Kastanienallee"],
    ["bunt-berlin.de", "BUNT Berlin"],
    ["buntkicktgut.de", "buntkicktgut"],
    ["bvre.de", "BVRE"],
    ["bwk-berlin.de", "BWK Berlin"],
    ["bzsl.de", "BZSL e.V."],
    ["caritas-berlin.de", "Caritas Berlin"],
    ["centro-hotels.de", "Centro Hotels"],
    ["chaberlin.org", "CHA Berlin"],
    ["charlottenburg-wilmersdorf.de", "Charlottenburg-Wilmersdorf"],
    ["checkup-info.de", "Checkup"],
    ["childrenofgutenberg.de", "Children of Gutenberg"],
    ["city54.de", "City54 Hotel"],
    ["cityeleven.de", "City Eleven"],
    ["cjd.de", "CJD – Christliches Jugenddorfwerk Deutschlands"],
    ["claim-allianz.de", "CLAIM Allianz"],
    ["clavis-schule.de", "Clavis Schule"],
    ["cleanuptrepnick.de", "Clean Up Trepnick"],
    ["club-dialog.de", "Club Dialog e.V."],
    ["communityempowerment.de", "Community Empowerment"],
    ["cybernomads.de", "Cybernomads"],
    ["daks-berlin.de", "DaKS Berlin"],
    ["damigra.de", "DaMigra e.V."],
    ["ddacademy.de", "DD Academy"],
    ["dekabristen.org", "Dekabristen e.V."],
    ["deutschland.hi.org", "Handicap International Deutschland"],
    ["diakoniewerk-simeon.de", "Diakoniewerk Simeon"],
    ["djo-bb.de", "DJO Berlin-Brandenburg"],
    ["djo-hilft.de", "DJO hilft"],
    ["dkhw.de", "Deutsches Kinderhilfswerk"],
    ["dormero.de", "Dormero Hotels"],
    ["drk-berlin.de", "DRK Berlin"],
    ["drk-berlin-nordost.de", "DRK Berlin Nordost"],
    ["drk-mueggelspree.de", "DRK Müggel-Spree"],
    ["d-s-e-e.de", "Deutsche Stiftung für Engagement und Ehrenamt"],
    ["easyerman.org", "Easy German"],
    ["ehrenamt.de", "Ehrenamt"],
    ["ejf.de", "EJF – Evangelisches Jugend- und Fürsorgewerk"],
    ["elikia-ev.org", "Elikia e.V."],
    ["enjoyhotel.de", "Enjoy Hotel"],
    ["etehadberlin.de", "Etehad Berlin"],
    ["eu-homecare.com", "European Homecare"],
    ["ev-mittendrin.de", "Mittendrin e.V."],
    ["fabrik-osloer-strasse.de", "Fabrik Osloer Straße"],
    ["fairmieten-fairwohnen.de", "Fair mieten – Fair wohnen"],
    ["familienbuero-lichtenberg.de", "Familienbüro Lichtenberg"],
    ["flexpress.info", "Flexpress"],
    ["flotte-berlin.de", "Flotte Berlin"],
    ["fluechtlingsrat-berlin.de", "Flüchtlingsrat Berlin"],
    ["frauenkreise-berlin.de", "Frauenkreise Berlin"],
    ["freiwilligenagentur.info", "Freiwilligenagentur"],
    ["fwa-mh.de", "Freiwilligenagentur Marzahn-Hellersdorf"],
    ["fzm-berlin.com", "FZM Berlin"],
    ["gbz-germany.org", "GBZ Germany"],
    ["gesellschaftsspiele.berlin", "Gesellschaftsspiele Berlin"],
    ["gesobau.de", "Gesobau"],
    ["getsmartakademie.de", "GetSmart Akademie"],
    ["gfp-berlin.de", "GFP Berlin"],
    ["giz.berlin", "GIZ Berlin"],
    ["gladt.de", "GLADT e.V."],
    ["gngberlin.de", "GNG Berlin"],
    ["goldnetz-berlin.de", "Goldnetz Berlin"],
    ["govolunteer.com", "GoVolunteer"],
    ["grenzgaenge.net", "Grenzgänge"],
    ["gu-freudstr.de", "GU Freudstraße"],
    ["gu-niedstr.de", "GU Niedstraße"],
    ["gu-quedlinburger.de", "GU Quedlinburger Straße"],
    ["gu-rauchstr.de", "GU Rauchstraße"],
    ["gwv-heerstrasse.de", "GWV Heerstraße"],
    ["handbookgermany.de", "Handbook Germany"],
    ["hangar1.de", "Hangar 1"],
    ["hausderstatistik.org", "Haus der Statistik"],
    ["heilsarmee.de", "Heilsarmee"],
    ["heroeurope.com", "HERO Europe"],
    ["hotel-am-gleisdreieck.de", "Hotel am Gleisdreieck"],
    ["house-of-resources.berlin", "House of Resources Berlin"],
    ["hvd-bb.de", "Humanistischer Verband Berlin-Brandenburg"],
    ["ib.de", "Internationaler Bund (IB)"],
    ["ikhberlin.de", "IKH Berlin"],
    ["indaed-berlin.de", "INDAED Berlin"],
    ["inssan.de", "Inssan e.V."],
    ["interflugs.de", "Interflugs"],
    ["interkular.de", "Interkular"],
    [
      "intmig.berlin.de",
      "Beauftragte des Senats für Integration und Migration",
    ],
    ["ipsocontext.org", "IPSO context"],
    ["iranischegemeinde.de", "Iranische Gemeinde in Deutschland"],
    ["isi-ev.de", "ISI e.V."],
    ["johanniter.de", "Johanniter-Unfall-Hilfe"],
    ["jsd.de", "JSD"],
    ["juma-ev.de", "JUMA e.V."],
    ["jumen.org", "JUMEN e.V."],
    ["karuna-ev.de", "Karuna e.V."],
    ["kbw.de", "KBW"],
    ["kein-abseits.de", "KEIN ABSEITS! e.V."],
    ["kiezklub-allende-ev.de", "Kiezklub Allende e.V."],
    ["kiezspinne.de", "Kiezspinne"],
    ["kieztandem.de", "Kieztandem"],
    ["kinderkulturmonat.de", "KinderKulturMonat"],
    ["kirchegemeinde-staaken.de", "Kirchengemeinde Staaken"],
    ["kirchenasyl.de", "Kirchenasyl"],
    ["kjhv.de", "KJHV"],
    ["kjsh.de", "KJSH"],
    ["kok-buero.de", "KOK e.V."],
    ["kompetenz-wasser.de", "Kompetenzzentrum Wasser Berlin"],
    ["kos-qualitaet.de", "KOS Qualität"],
    ["kottiberlin.de", "Kotti Berlin"],
    ["kub-berlin.org", "KuB Berlin"],
    ["kulturleben-berlin.de", "KulturLeben Berlin"],
    ["kulturnest.org", "Kulturnest"],
    ["kulturschafft.de", "KulturSchafft"],
    ["kungerkiez.de", "Kungerkiez"],
    ["laf.berlin.de", "Landesamt für Flüchtlingsangelegenheiten (LAF)"],
    ["lagfa.berlin", "LAGFA Berlin"],
    ["landesfreiwilligenagentur.berlin", "Landesfreiwilligenagentur Berlin"],
    ["lara-berlin.de", "LARA Berlin"],
    ["la-red.eu", "La Red"],
    ["laruhelpsukraine.com", "Laru Helps Ukraine"],
    ["lernlabor.berlin", "Lernlabor Berlin"],
    ["letsact.de", "LetsAct"],
    ["lfg-b.de", "LFG-B"],
    ["lichtenberg.berlin.de", "Bezirksamt Lichtenberg"],
    ["lilipadlibrary.org", "Lilipad Library"],
    ["list-gmbh.de", "L.I.S.T. GmbH"],
    ["lnob.net", "Leave No One Behind"],
    ["lsb-berlin.de", "Landessportbund Berlin"],
    ["ma.jao-berlin.de", "JAO Berlin"],
    ["malteser.org", "Malteser"],
    ["marzahn-sued.de", "Marzahn-Süd"],
    ["milaa-berlin.de", "Milaa Berlin"],
    ["mim-ev.de", "MiM e.V."],
    ["mingru-jipen.com", "Mingru Jipen e.V."],
    ["mit-mach-musik.de", "Mit-Mach-Musik"],
    ["mittelhof.org", "Mittelhof e.V."],
    ["moabit-hilft.com", "Moabit hilft"],
    ["moment-mal.org", "Moment mal"],
    ["moveglobal.de", "moveGLOBAL e.V."],
    ["mts-socialdesign.com", "MTS Social Design"],
    ["muenchen.de", "Landeshauptstadt München"],
    ["music-for-identity.com", "Music for Identity"],
    ["nachbarschafft-ev.de", "NachbarschaFFt e.V."],
    ["nachhilf-sprachen-berlin.de", "Nachhilfe Sprachen Berlin"],
    ["nbhs.de", "Nachbarschaftsheim Schöneberg"],
    ["need4deed.org", "Need4Deed"],
    ["nez-neukoelln.de", "NEZ Neukölln"],
    ["novum-hospitality.com", "Novum Hospitality"],
    ["offenetuer.net", "Offene Tür"],
    ["offensiv91.de", "Offensiv '91"],
    ["olamaid.org", "Olamaid"],
    ["onpurpose.berlin", "On Purpose Berlin"],
    ["opentiny.de", "OpenTiny"],
    ["oskar.berlin", "Oskar Berlin"],
    ["pad-berlin.de", "PAD Berlin"],
    ["panda-platforma.berlin", "Panda Platforma"],
    ["pankow-hilft.de", "Pankow hilft"],
    ["paragraf1.de", "Paragraf 1"],
    ["paritaet.org", "Der Paritätische"],
    ["peace-train-berlin.de", "Peace Train Berlin"],
    ["pegasusgmbh.de", "Pegasus GmbH"],
    ["peoplebeyondborders.org", "People Beyond Borders"],
    ["pfh-berlin.de", "PFH Berlin"],
    ["pgssoziales.de", "PGS Soziales"],
    ["pinel.de", "Pinel"],
    ["prisod-wohnen.de", "PRISOD Wohnen"],
    ["proasyl.de", "PRO ASYL"],
    ["projecttogether.org", "ProjectTogether"],
    ["psv-treptow.de", "PSV Treptow"],
    ["quarteera.de", "Quarteera e.V."],
    ["redi-school.org", "ReDI School"],
    ["reforum.io", "Reforum"],
    ["refrat.hu-berlin.de", "RefRat HU Berlin"],
    ["refugees-welcome.net", "Refugees Welcome"],
    ["reinhold-burger-schule.de", "Reinhold-Burger-Schule"],
    ["reinickendorf.berlin.de", "Bezirksamt Reinickendorf"],
    ["reistrommel-ev.de", "Reistrommel e.V."],
    ["rescue.org", "International Rescue Committee"],
    ["riwwel.eu", "Riwwel"],
    ["rlc-berlin.org", "Refugee Law Clinic Berlin"],
    ["r-lichtenberg.de", "R-Lichtenberg"],
    ["s27.de", "S27"],
    ["salamkulturclub.de", "Salam Kulturclub"],
    ["savethechildren.de", "Save the Children Deutschland"],
    ["schildkroete-berlin.de", "Schildkröte Berlin"],
    ["schoeneberg-hilft.de", "Schöneberg hilft"],
    ["sc-horus.com", "SC Horus"],
    [
      "senasgiva.berlin.de",
      "Senatsverwaltung für Arbeit, Soziales, Gleichstellung, Integration, Vielfalt und Antidiskriminierung",
    ],
    ["sin-ev.de", "SIN e.V."],
    ["somalis-berlin.de", "Somalis Berlin"],
    ["sozdia.de", "SozDia"],
    ["soziales-berlin.com", "Soziales Berlin"],
    ["sprachcafe-polnisch.org", "Sprachcafé Polnisch"],
    ["stephanus.org", "Stephanus-Stiftung"],
    ["sternenfischer.org", "Sternenfischer Freiwilligenzentrum"],
    ["stiftung-berliner-leben.de", "Stiftung Berliner Leben"],
    ["stk118.de", "STK 118"],
    ["stuetzrad.de", "Stützrad"],
    ["susi-frauen-zentrum.com", "SUSI Frauenzentrum"],
    ["sylvester-ev.de", "Sylvester e.V."],
    ["tamaja.de", "Tamaja"],
    ["tamaja-gu.de", "Tamaja GU"],
    ["tbb-berlin.de", "Türkischer Bund in Berlin-Brandenburg (TBB)"],
    ["thessa-ev.de", "Thessa e.V."],
    ["thfwelcome.de", "THF Welcome"],
    ["tik-berlin.de", "TIK Berlin"],
    ["tio-berlin.de", "TIO Berlin"],
    ["torhausberlin.de", "Torhaus Berlin"],
    ["transinterqueer.org", "TransInterQueer e.V."],
    ["tuerkischerfrauenverein-berlin.de", "Türkischer Frauenverein Berlin"],
    ["tueroeffner-ev.de", "Türöffner e.V."],
    ["ueberdentellerrand.org", "Über den Tellerrand"],
    ["ueberleben.org", "Zentrum Überleben"],
    ["ulme35.de", "Ulme35"],
    ["unionhilfswerk.de", "Unionhilfswerk"],
    ["vhspankow.de", "VHS Pankow"],
    ["vhs-spandau.de", "VHS Spandau"],
    ["vhstk.de", "VHS Treptow-Köpenick"],
    ["via-in-berlin.de", "VIA Berlin"],
    ["vistaberlin.de", "Vista Berlin"],
    ["volkssolidaritaet.de", "Volkssolidarität"],
    ["vorspiel-berlin.de", "Vorspiel Berlin"],
    ["vostel.de", "Vostel"],
    ["weeberpartner.de", "Weeber+Partner"],
    ["wellbeing4everyone.com", "Wellbeing4Everyone"],
    ["wib-jugend.de", "WIB Jugend"],
    ["wikobuesz.berlin", "WiKo Büsz"],
    ["wirgestaltenev.de", "Wir gestalten e.V."],
    ["wir-netzwerk.de", "WIR Netzwerk"],
    ["wittenau-sued.de", "Wittenau-Süd"],
    ["xenion.org", "XENION e.V."],
    ["xochicuicatl.de", "Xochicuicatl e.V."],
    ["yaarberlin.de", "Yaar Berlin"],
    ["zaki-ev.de", "ZAKI e.V."],
    ["zgh-friedenau.de", "ZGH Friedenau"],
    ["zukunft-memorial.org", "Zukunft Memorial"],
  ];

export class RenameDomainSeededOrganizations1790769607004
  implements MigrationInterface
{
  name = "RenameDomainSeededOrganizations1790769607004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const titles = new Map(ORGANIZATION_TITLES_BY_DOMAIN);

    for (const [alias, canonical] of ORGANIZATION_DOMAIN_ALIASES) {
      const [aliasRow]: { id: number }[] = await queryRunner.query(
        `SELECT "id" FROM "organization" WHERE "title" = $1`,
        [alias],
      );
      if (!aliasRow) {
        continue;
      }
      // The canonical row may still carry its domain or already be renamed.
      const [canonicalRow]: { id: number }[] = await queryRunner.query(
        `SELECT "id" FROM "organization" WHERE "title" IN ($1, $2) ORDER BY "id" LIMIT 1`,
        [canonical, titles.get(canonical)],
      );
      if (canonicalRow) {
        await queryRunner.query(
          `UPDATE "agent" SET "organization_id" = $1 WHERE "organization_id" = $2`,
          [canonicalRow.id, aliasRow.id],
        );
        await queryRunner.query(`DELETE FROM "organization" WHERE "id" = $1`, [
          aliasRow.id,
        ]);
      } else {
        // No canonical row: the alias row becomes it.
        await queryRunner.query(
          `UPDATE "organization" SET "title" = $1 WHERE "id" = $2`,
          [canonical, aliasRow.id],
        );
      }
    }

    let renamed = 0;
    const skipped: string[] = [];
    for (const [domain, title] of ORGANIZATION_TITLES_BY_DOMAIN) {
      const rows: { id: number }[] = await queryRunner.query(
        `UPDATE "organization"
         SET "title" = $2, "website" = COALESCE(NULLIF("website", ''), $1)
         WHERE "title" = $1
           AND NOT EXISTS (SELECT 1 FROM "organization" WHERE "title" = $2)
         RETURNING "id"`,
        [domain, title],
      );
      if (rows.length) {
        renamed += 1;
        continue;
      }
      const [stillDomain]: { id: number }[] = await queryRunner.query(
        `SELECT "id" FROM "organization" WHERE "title" = $1`,
        [domain],
      );
      if (stillDomain) {
        skipped.push(domain);
      }
    }

    console.warn(
      `[rename-domain-seeded-organizations] renamed ${renamed} of ${ORGANIZATION_TITLES_BY_DOMAIN.length} candidates`,
    );
    if (skipped.length) {
      console.warn(
        `[rename-domain-seeded-organizations] skipped (target title already taken): ${skipped.join(", ")}`,
      );
    }
  }

  // Restores the domain titles of rows that still carry the curated title.
  // Merged alias rows aren't recreated, and `website` is left as is.
  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [domain, title] of ORGANIZATION_TITLES_BY_DOMAIN) {
      await queryRunner.query(
        `UPDATE "organization" SET "title" = $1
         WHERE "title" = $2
           AND NOT EXISTS (SELECT 1 FROM "organization" WHERE "title" = $1)`,
        [domain, title],
      );
    }
  }
}
