export enum ByDay {
  MO = "Monday",
  TU = "Tuesday",
  WE = "Wednesday",
  TH = "Thursday",
  FR = "Friday",
  SA = "Saturday",
  SU = "Sunday",
}

export type Occasionally = "occasionally";
export type OccasionalDays = "weekends" | "weekdays";

export enum Hour {
  H00 = "0:00",
  H01 = "1:00",
  H02 = "2:00",
  H03 = "3:00",
  H04 = "4:00",
  H05 = "5:00",
  H06 = "6:00",
  H07 = "7:00",
  H08 = "8:00",
  H09 = "9:00",
  H10 = "10:00",
  H11 = "11:00",
  H12 = "12:00",
  H13 = "13:00",
  H14 = "14:00",
  H15 = "15:00",
  H16 = "16:00",
  H17 = "17:00",
  H18 = "18:00",
  H19 = "19:00",
  H20 = "20:00",
  H21 = "21:00",
  H22 = "22:00",
  H23 = "23:00",
  H24 = "24:00",
}

export type Daytime = [Hour, Hour] | OccasionalDays;

export interface AvailabilityAPI {
  day: ByDay | Occasionally;
  daytime: Daytime;
}

export interface VolunteerAPI {
  name: string;
  phone: string;
  email: string;
  nativeLanguages: string[];
  fluentLanguages: string[];
  intermediateLanguages: string[];
  availability: AvailabilityAPI[];
  activities: string[];
  skills: string[];
}
