// be#1061: domain -> display-name map for the organizations seeded from
// email domains by SeedOrganizationFromAgentDomains1786109950000, used by
// RenameDomainSeededOrganizations1790769607004.
//
// A `null` title means the organization isn't a real operator (Träger) and is
// removed. Domains that map to the same title are one operator and get
// merged into a single organization. A list of titles means several
// operators share the domain: the seeded row becomes the first one, the
// others are added as organizations of their own.
//
// Loaded from the CDN (${CDN_BASE_URL}/data/organization-titles.json, a
// flat { domain: title | title[] | null } object), so names can be corrected without a
// code change before the migration runs. CDN entries override the built-in
// map per key; if the fetch fails or the JSON is malformed, the built-in map
// is used as is — the same fallback pattern as the notify email manifests.
//
// Lives outside src/data/migrations on purpose: TypeORM instantiates every
// exported function in a migration file as a migration class.

export type OrganizationTitles = string | [string, ...string[]] | null;
export type OrganizationTitleMap = Record<string, OrganizationTitles>;

const isTitle = (v: unknown): v is string =>
  typeof v === "string" && v.trim() !== "";

const ORGANIZATION_TITLES_URL = `${
  process.env.CDN_BASE_URL || "https://cdn.need4deed.org"
}/data/organization-titles.json`;
const FETCH_TIMEOUT_MS = 5000;

export const BUILTIN_ORGANIZATION_TITLES: OrganizationTitleMap = {
  "adas-berlin.de": "LIFE Bildung Umwelt Chancengleichheit e.V.",
  "afghanistankomitee.de":
    "Afghanistan-Komitee für Frieden, Wiederaufbau und Kultur e.V.",
  "ag-spas.de":
    "Arbeitsgemeinschaft für Sozialplanung und angewandte Stadtforschung e.V.",
  "agens-berlin.de": null,
  "akademie.org": "Paritätische Akademie Berlin gGmbH",
  "aktion-fh.de": "Aktion für Flüchtlingshilfe e.V.",
  "albatrosggmbh.de": "Albatros gGmbH",
  "alecsa-hotel.de": null,
  "alep-ev.de": "ALEP e.V.",
  "alt-hsh.de": null,
  "amaroforo.de": "Amaro Foro e.V.",
  "amuberlin.de":
    '„Ausländer mit uns" Verein zur Förderung interkultureller Begegnungen e.V.',
  "arrivalsupport.berlin": null,
  "artivisten.org": "Artivisten e.V.",
  "ash-berlin.eu": null,
  "ask-dogan.de": null,
  "ausbildung-ota.de": "Ausbildungszentrum OTA GmbH",
  "awo-mitte.de": "AWO Kreisverband Berlin-Mitte e.V.",
  "awo-spree-wuhle.de": "AWO Kreisverband Berlin Spree-Wuhle e. V.",
  "b-b-e.de": "Bundesnetzwerk Bürgerschaftliches Engagement (BBE)",
  "ba-fk.berlin.de": "Bezirksamt Friedrichshain-Kreuzberg",
  "ba-mh.berlin.de": "Bezirksamt Marzahn-Hellersdorf von Berlin",
  "ba-mh.verwalt-berlin.de": "Bezirksamt Marzahn-Hellersdorf von Berlin",
  "ba-mitte.berlin.de": "Bezirksamt Mitte von Berlin",
  "ba-spandau.berlin.de": "Bezirksamt Spandau von Berlin",
  "ba-sz.berlin.de": "Bezirksamt Steglitz-Zehlendorf von Berlin",
  "ba-tk.berlin.de": "Bezirksamt Treptow-Köpenick von Berlin",
  "ba-ts.berlin.de": "Bezirksamt Tempelhof-Schöneberg von Berlin",
  "baff-zentren.org": null,
  "bagfa.de": "Bundesarbeitsgemeinschaft der Freiwilligenagenturen e.V.",
  "bdb-germany.de": null,
  "bedcon.net": "BedCon GmbH",
  "begspo.de": "BEGSpo gUG",
  "benn-altglienicke.de": "Stadtkümmerei GmbH",
  "benn-blumbergerdamm.de": "pad gGmbH",
  "benn-buch.de": "Mieterberatung Prenzlauer Berg GmbH",
  "benn-tegelsued.de": "Mieterberatung Prenzlauer Berg GmbH",
  "bennimmv.de": "Kirchengemeinde Apostel-Petrus",
  "beratungsnetz-migration.de":
    "Verband für Interkulturelle Arbeit (VIA) Regionalverband Berlin/Brandenburg e.V.",
  "berlin-aidshilfe.de": "Berliner Aids-Hilfe e.V.",
  "berlin-hilft.com": "Berlin hilft!",
  "berliner-stadtmission.de": "Verein für Berliner Stadtmission",
  "berlintoborders.org": "Berlin to Borders e.V.",
  "bethania.de": "Bethania Diakonie gGmbH",
  "bezirksamt-neukoelln.de": "Bezirksamt Neukölln von Berlin",
  "bildungsmarkt.de": "bildungsmarkt e.V.",
  "bmbfsfjservice.bund.de":
    "Bundesministerium für Bildung, Familie, Senioren, Frauen und Jugend",
  "bona-peiser.de": "Wassertor e.V.",
  "boulevard-kastanienallee.de": "Bezirksamt Marzahn-Hellersdorf von Berlin",
  "bunt-berlin.de": "Bunt – Stiftung Bildung und integrative Arbeit gGmbH",
  "buntkicktgut.de": "buntkicktgut gemeinnützige GmbH",
  "bvre.de": "Bundesverband Russischsprachiger Eltern e.V.",
  "bwk-berlin.de": "BWK BildungsWerk in Kreuzberg GmbH",
  "bzsl.de": "BZSL e.V.",
  "caritas-berlin.de": "Caritasverband für das Erzbistum Berlin e.V.",
  "centro-hotels.de": null,
  "chaberlin.org": "Centre for Humanitarian Action e.V.",
  "charlottenburg-wilmersdorf.de":
    "Bezirksamt Charlottenburg-Wilmersdorf von Berlin",
  "checkup-info.de": null,
  "childrenofgutenberg.de": null,
  "city54.de": "City One Soziale Dienstleistungen GmbH",
  "city54hotel.de": "City One Soziale Dienstleistungen GmbH",
  "cityeleven.de": "City One Soziale Dienstleistungen GmbH",
  "cjd.de": "Christliches Jugenddorfwerk Deutschlands gemeinnütziger e. V.",
  "claim-allianz.de": "CLAIM gGmbH",
  "clavis-schule.de": null,
  "cleanuptrepnick.de": "Clean Up Trepnick",
  "club-dialog.de": "Club Dialog e.V.",
  "communityempowerment.de": "Spandauer Jugend e.V.",
  "cybernomads.de": null,
  "d-s-e-e.de": "Deutsche Stiftung für Engagement und Ehrenamt",
  "daks-berlin.de": "Dachverband Berliner Kinder- und Schülerläden (DaKS) e.V.",
  "damigra.de": "DaMigra e. V.",
  "ddacademy.de": null,
  "dekabristen.org": "Dekabristen e.V.",
  "deutschland.hi.org": "Handicap International e.V.",
  "diakoniewerk-simeon.de": "Diakoniewerk Simeon gGmbH",
  "djo-bb.de": "Jugendbund djo-Deutscher Regenbogen, Landesverband Berlin e.V.",
  "djo-hilft.de": "djo-Bildungswerk Berlin gGmbH",
  "dkhw.de": "Deutsches Kinderhilfswerk e.V.",
  "dormero.de": "Dormero Hotels",
  "drk-berlin-nordost.de": "Kreisverband Berlin-Nordost e.V.",
  "drk-berlin.de": "Landesverband Berliner Rotes Kreuz e.V.",
  "drk-mueggelspree.de": "Deutsches Rotes Kreuz Kreisverband Müggelspree e.V.",
  "easyerman.org": null,
  "ehrenamt.de": "Akademie für Ehrenamtlichkeit Deutschland (fjs e.V.)",
  "ejf.de": "EJF gemeinnützige AG",
  "elikia-ev.org": "Elikia e.V.",
  "enjoyhotel.de": null,
  "etehadberlin.de": "Etehad e.V.",
  "eu-homecare.com": "European Homecare GmbH",
  "ev-mittendrin.de": "MITTENDRIN leben e. V.",
  "fabrik-osloer-strasse.de": "Fabrik Osloer Straße gGmbH",
  "fairmieten-fairwohnen.de":
    "Türkischer Bund in Berlin-Brandenburg e.V. (TBB)",
  "familienbuero-lichtenberg.de": "pad gGmbH",
  "flexpress.info": null,
  "flotte-berlin.de": null,
  "fluechtlingsrat-berlin.de": "Flüchtlingsrat Berlin e. V.",
  "frauenkreise-berlin.de": "AGAPI e. V.",
  "freiwilligenagentur.info":
    "Diakonisches Werk Steglitz und Teltow-Zehlendorf e.V.",
  "fwa-mh.de": "Wir fördern Engagement e.V.",
  "fzm-berlin.com": "Feministisches Zentrum für Migrant*innen e. V. (FZM*)",
  "gbz-germany.org": "GBZ Germany",
  "gesellschaftsspiele.berlin": "Gesellschaftsspiele e.V.",
  "gesobau.de": null,
  "getsmartakademie.de": null,
  "gfp-berlin.de": "gfp Gesellschaft für Pflege- und Sozialberufe gGmbH",
  "giz.berlin": "GIZ gGmbH",
  "gladt.de": "GLADT e.V.",
  "gngberlin.de": "Global New Generation Berlin e.V.",
  "goldnetz-berlin.de": "Goldnetz gGmbH / e.V.",
  "govolunteer.com": "GoVolunteer e.V.",
  "grenzgaenge.net": "grenzgänge | bildung im stadtraum e.V.",
  "gu-freudstr.de": "DRK Schöneberg-Wilmersdorf hilft gGmbH",
  "gu-niedstr.de": "DRK Schöneberg-Wilmersdorf hilft gGmbH",
  "gu-quedlinburger.de": "DRK Schöneberg-Wilmersdorf hilft gGmbH",
  "gu-rauchstr.de": "DRK Schöneberg-Wilmersdorf hilft gGmbH",
  "gwv-heerstrasse.de": "Gemeinwesenverein Heerstraße Nord e.V.",
  "handbookgermany.de": null,
  "hangar1.de": "Tamaja Soziale Unternehmen GmbH",
  "hausderstatistik.org": "Haus der Statistik",
  "heilsarmee.de": "Die Heilsarmee in Deutschland",
  "heroeurope.com": "Hero Services gGmbH",
  "hotel-am-gleisdreieck.de": null,
  "house-of-resouces.berlin": null,
  "house-of-resources.berlin": null,
  "hvd-bb.de": null,
  "ib.de":
    "Internationaler Bund (IB) Freier Träger der Jugend-, Sozial- und Bildungsarbeit e.V.",
  "ikhberlin.de": null,
  "indaed-berlin.de": null,
  "inssan.de": "Migrationsrat Berlin e. V.",
  "interflugs.de": null,
  "interkular.de": "interkular gGmbH",
  "intmig.berlin.de": null,
  "ipsocontext.org": "Ipso gemeinnützige Gesellschaft mbH",
  "iranischegemeinde.de": "Iranische Gemeinde in Deutschland e.V.",
  "isi-ev.de": "Initiative Selbständiger Immigrantinnen e. V.",
  "johanniter.de": "Johanniter-Unfall-Hilfe e.V.",
  "jsd.de": "Johannesstift Diakonie gAG",
  "juma-ev.de": null,
  "jumen.org": "JUMEN e.V.",
  "karuna-ev.de": "KARUNA e. V.",
  "kbw.de": "Kommunales Bildungswerk e.V.",
  "kein-abseits.de": "kein Abseits! e.V.",
  "kiezklub-allende-ev.de": "Förderverein KIEZKLUB Allende e.V.",
  "kiezspinne.de": "Kiezspinne FAS Nachbarschaftlicher Interessenverbund e.V.",
  "kieztandem.de": "Stiftung Unionhilfswerk Berlin",
  "kinderkulturmonat.de": "WerkStadt Kulturverein Berlin e.V.",
  "kirchegemeinde-staaken.de": null,
  "kirchenasyl.de": "Bundesarbeitsgemeinschaft Asyl in der Kirche e.V.",
  "kjhv.de": null,
  "kjsh.de": null,
  "kok-buero.de": null,
  "kompetenz-wasser.de": null,
  "kos-qualitaet.de": null,
  "kottiberlin.de": null,
  "kub-berlin.org":
    "Kontakt- und Beratungsstelle für Geflüchtete und Migrant*innen e.V.",
  "kulturleben-berlin.de": "KulturLeben Berlin – Schlüssel zur Kultur e. V.",
  "kulturnest.org": null,
  "kulturschafft.de": "Kulturschafft e.V.",
  "kungerkiez.de": "KungerKiezInitiative e.V.",
  "la-red.eu": "La Red – Vernetzung und Integration e.V.",
  "laf.berlin.de":
    "Landesamt für Flüchtlingsangelegenheiten und Unterbringung Berlin (LFU)",
  "lagfa.berlin":
    "Landesarbeitsgemeinschaft der Freiwilligenagenturen Berlin e.V.",
  "landesfreiwilligenagentur.berlin": "Landesfreiwilligenagentur Berlin e. V.",
  "lara-berlin.de": "LARA - Verein gegen sexuelle Gewalt an Frauen e.V.",
  "laruhelpsukraine.com": "LaruHelpsUkraine e.V.",
  "lernlabor.berlin": null,
  "letsact.de": null,
  "lfg-b.de":
    "Landesbetrieb für Gebäudebewirtschaftung Berlin - Betriebsteil B",
  "lichtenberg.berlin.de": "Bezirksamt Lichtenberg von Berlin",
  "lilipadlibrary.org": "Lilipad e.V.",
  "list-gmbh.de": null,
  "lnob.net": "Civilfleet-Support e.V.",
  "lsb-berlin.de": null,
  "ma.jao-berlin.de": "JAO gGmbH",
  "malteser.org": "Malteser Hilfsdienst e.V.",
  "marzahn-sued.de": "pad gGmbH",
  "milaa-berlin.de": "milaa gGmbH",
  "mim-ev.de": "MIM - Migrantinnen in Marzahn e.V.",
  "mimev.de": "MIM - Migrantinnen in Marzahn e.V.",
  "mingru-jipen.com": "Mingru Jipen e.V.",
  "mit-mach-musik.de": null,
  "mittelhof.org": "Mittelhof e.V.",
  "moabit-hilft.com": "Moabit hilft e.V.",
  "moment-mal.org": "moment.mal e.V.",
  "moveglobal.de": "moveGLOBAL e.V.",
  "mts-socialdesign.com": "MTS Social Design (morethanshelters GmbH)",
  "muenchen.de": "Landeshauptstadt München",
  "music-for-identity.com": null,
  "nachbarschafft-ev.de": "nachbarschafft e. V.",
  "nachhilf-sprachen-berlin.de": null,
  "nbhs.de": "Nachbarschaftsheim Schöneberg e.V.",
  "need4deed.org": "Club Dialog e.V.",
  "nez-neukoelln.de": "Arbeiterwohlfahrt Berlin Kreisverband Südost e.V.",
  "novum-hospitality.com": null,
  "offenetuer.net": "Offene Tür für Menschen aller Welt e.V.",
  "offensiv91.de": "offensiv’91 e.V.",
  "olamaid.org": "OlamAid e.V.",
  "onpurpose.berlin": "On Purpose Berlin Careers GmbH",
  "opentiny.de": null,
  "oskar.berlin": "Stiftung Unionhilfswerk Berlin",
  "pad-berlin.de": "pad gGmbH",
  "panda-platforma.berlin": "Panda Platforma",
  "pankow-hilft.de": "Interessengemeinschaft Pankow Hilft!",
  "paragraf1.de": "paragraf 1 Soziale Dienste gGmbH",
  "paritaet.org":
    "Deutscher Paritätischer Wohlfahrtsverband - Gesamtverband e. V.",
  "peace-train-berlin.de": null,
  "pegasusgmbh.de": null,
  "peoplebeyondborders.org": null,
  "pfh-berlin.de": "Pestalozzi-Fröbel-Haus Stiftung öffentlichen Rechts",
  "pgssoziales.de": "Paul Gerhardt Stift Soziales gGmbH",
  "pinel.de": null,
  "prisod-wohnen.de": "Prisod Wohnheimbetriebs GmbH",
  "proasyl.de": "PRO ASYL e.V.",
  "projecttogether.org": "ProjectTogether gGmbH",
  "psv-treptow.de": "Psychosozialer Verbund Treptow e.V.",
  "quarteera.de": "Quarteera e. V.",
  "r-lichtenberg.de": "WIR.DE Aktive Nachbarn UG (haftungsbeschränkt)",
  "redi-school.org": "ReDI School of Digital Integration gGmbH",
  "reforum.io": null,
  "refrat.hu-berlin.de": null,
  "refugees-welcome.net": null,
  "reinhold-burger-schule.de": "Bezirksamt Pankow von Berlin",
  "reinickendorf.berlin.de": "Bezirksamt Reinickendorf von Berlin",
  "reistrommel-ev.de": "Reistrommel e.V.",
  "rescue.org": "IRC Deutschland gGmbH",
  "riwwel.eu": "Riwwel gUG",
  "rlc-berlin.org": "Refugee Law Clinic Berlin e.V.",
  "s27.de": "Verein zur Förderung der Interkulturellen Jugendarbeit e.V.",
  "salamkulturclub.de": "Salam Kultur- und Sportclub e.V.",
  "savethechildren.de": "Save the Children Deutschland e. V.",
  "sc-horus.com": "Sporting Club Horus e. V.",
  "schildkroete-berlin.de": "Schildkröte GmbH",
  "schoeneberg-hilft.de": "Schöneberg hilft e.V.",
  "senasgiva.berlin.de":
    "Senatsverwaltung für Arbeit, Soziales, Gleichstellung, Integration, Vielfalt und Antidiskriminierung",
  "sin-ev.de": "SIN e.V.",
  "somalis-berlin.de": "Somalische Kultur und Hilfe Verein e.V",
  "sozdia.de": "SozDia Stiftung Berlin - Gemeinsam Leben Gestalten",
  "soziales-berlin.com": "SB Soziales Berlin Jugendhilfe gGmbH",
  "sprachcafe-polnisch.org": "SprachCafé Polnisch e.V.",
  "stephanus.org": "Stephanus-Stiftung, Stiftung bürgerlichen Rechts",
  "sternenfischer.org": "Stiftung Unionhilfswerk Berlin",
  "stiftung-berliner-leben.de":
    "Stiftung Berliner Leben, Gemeinnützige Stiftung des bürgerlichen Rechts",
  "stk118.de": "STK 118 GmbH",
  "stuetzrad.de": "stützrad gGmbH",
  "susi-frauen-zentrum.com": "Für eine kulturvolle, solidarische Welt e.V.",
  "sylvester-ev.de": "Sylvester e.V. Berlin",
  "tamaja-gu.de": null,
  "tamaja.de": "Tamaja Soziale Unternehmen GmbH",
  "tbb-berlin.de": "Türkischer Bund in Berlin-Brandenburg e.V.",
  "thessa-ev.de": "Thessa e.V.",
  "thfwelcome.de": "THFwelcome e.V.",
  "tik-berlin.de": "TIK e. V.",
  "tio-berlin.de": "TIO e.V.",
  "torhausberlin.de": "Torhaus Berlin e.V.",
  "transinterqueer.org": "TransInterQueer e.V.",
  "tuerkischerfrauenverein-berlin.de": "Türkischer Frauenverein Berlin e. V.",
  "tueroeffner-ev.de":
    "Türöffner e.V. – Jobnetzwerk für Geflüchtete in Treptow-Köpenick",
  "ueberdentellerrand.org": "Über den Tellerrand e.V.",
  "ueberleben.org": "Zentrum ÜBERLEBEN gGmbH",
  "ulme35.de": "Interkulturanstalten Westend e.V.",
  "unionhilfswerk.de": "Stiftung Unionhilfswerk Berlin",
  "vhs-spandau.de": null,
  "vhspankow.de": null,
  "vhstk.de": null,
  "via-in-berlin.de": "Regionalverband Berlin/Brandenburg e.V.",
  "vistaberlin.de":
    "Verbund für integrative soziale und therapeutische Arbeit gGmbH",
  "volkssolidaritaet.de": "Volkssolidarität Bundesverband e. V.",
  "vorspiel-berlin.de": "Vorspiel - Queerer Sportverein Berlin e. V.",
  "vostel.de": "vostel volunteering UG (haftungsbeschränkt)",
  "weeberpartner.de": null,
  "wellbeing4everyone.com": "ForEveryone Civic gGmbH",
  "wib-jugend.de": "Wir im Brunnenviertel e.V.",
  "wikobuesz.berlin": null,
  "wir-netzwerk.de": "Willkommen in Reinickendorf e.V.",
  "wirgestaltenev.de": "WIR GESTALTEN e.V.",
  "wittenau-sued.de": [
    "Stadtkümmerei GmbH",
    "Gesellschaft für integrierte Stadtentwicklung mbH",
  ],
  "xenion.org": "XENION Psychosoziale Hilfen für politisch Verfolgte e.V.",
  "xochicuicatl.de": "Xochicuicatl e.V.",
  "yaarberlin.de": "YAAR e.V.",
  "zaki-ev.de": "Zaki – Bildung und Kultur e.V.",
  "zgh-friedenau.de": null,
  "zukunft-memorial.org": "Zukunft MEMORIAL e.V.",
};

// Processed first, so that when several domains merge into one organization
// the surviving row keeps the operator's main domain as its website.
export const PRIMARY_ORGANIZATION_DOMAINS = [
  "ba-mh.berlin.de",
  "city54.de",
  "club-dialog.de",
  "mim-ev.de",
  "pad-berlin.de",
  "tamaja.de",
  "unionhilfswerk.de",
];

// Operators that weren't in the domain seed at all; inserted if missing.
export const NEW_ORGANIZATIONS: { title: string; website: string }[] = [
  {
    title: "Senatsverwaltung für Bildung, Jugend und Familie",
    website:
      "https://www.berlin.de/sen/bildung/unterstuetzung/beratungszentren-sibuz/pankow/",
  },
];

function isTitleMap(value: unknown): value is OrganizationTitleMap {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (v) =>
        v === null ||
        isTitle(v) ||
        (Array.isArray(v) && v.length > 0 && v.every(isTitle)),
    )
  );
}

export async function loadOrganizationTitleMap(
  url = ORGANIZATION_TITLES_URL,
): Promise<OrganizationTitleMap> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const body: unknown = await res.json();
    if (!isTitleMap(body)) {
      throw new Error("expected { domain: title | title[] | null }");
    }
    console.warn(
      `[rename-domain-seeded-organizations] using CDN map (${Object.keys(body).length} override(s)) over the built-in one`,
    );
    return { ...BUILTIN_ORGANIZATION_TITLES, ...body };
  } catch (err) {
    console.warn(
      `[rename-domain-seeded-organizations] CDN map unavailable (${url}: ${err instanceof Error ? err.message : err}), using the built-in one`,
    );
    return BUILTIN_ORGANIZATION_TITLES;
  }
}
