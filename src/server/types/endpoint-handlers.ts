import {
  ApiPostListQuery,
  Lang,
  OpportunitySortField,
  QueryParamsKeys,
  SortOrder,
  UserRole,
} from "need4deed-sdk";

export interface ParamsId {
  id: number;
}

export interface DataId {
  id: number;
}

export type ReplyDataCount<T> = {
  message: string;
  data: T;
  count: number;
};

export type ReplyData<T> = Omit<ReplyDataCount<T>, "count">;

export type ReplyMessage = { message: string };

export interface QuerystringPagination {
  page?: number;
  limit?: number;
}

export interface QuerystringPaginationOrdering extends QuerystringPagination {
  sortOrder?: SortOrder;
}

export interface QuerystringPaginationLanguage
  extends QuerystringPaginationOrdering {
  language: Lang;
}

export interface QuerystringEventGetList {
  language?: Lang;
  search?: string;
  from?: string;
  to?: string;
}

export interface QuerystringEventGet {
  language?: Lang;
}

export interface QuerystringCommuteFiltering {
  [QueryParamsKeys.COMMUTE_POSTCODE]?: string;
  [QueryParamsKeys.MAX_COMMUTE_MINUTES]?: number;
}

export interface QuerystringOpportunityFiltering {
  filter?: {
    type: string;
    status: string;
    agentId?: number;
    search?: string;
    language?: string;
    activity?: string;
    skill?: string;
    availability?: string | string[];
    district?: string;
  } & QuerystringCommuteFiltering;
}

export type QuerystringOpportunityGetList = QuerystringPaginationLanguage &
  QuerystringOpportunityFiltering;

export type QuerystringVolunteerOpportunityGetList =
  QuerystringPaginationLanguage &
    NonNullable<QuerystringOpportunityFiltering["filter"]>;

export type QuerystringOpportunityList = QuerystringPaginationLanguage &
  QuerystringOpportunityFiltering & {
    sortBy?: OpportunitySortField;
    appointmentDateFrom?: string;
    appointmentDateTo?: string;
    hasAppointmentDate?: boolean;
    excludeAccompanying?: boolean;
  };

export interface QuerystringAgentFiltering {
  filter?: {
    search?: string;
    street?: string;
    district?: string[];
    type?: string[];
    volunteerSearch?: string[];
    engagementStatus?: string[];
    services?: string[];
  };
}

export type QuerystringAgentGetList = QuerystringPaginationLanguage &
  QuerystringAgentFiltering;

export interface QuerystringVolunteerFiltering {
  filter?: {
    type?: string | string[];
    search?: string;
    language?: string | string[];
    activity?: string | string[];
    skill?: string | string[];
    availability?: string | string[];
    district?: string | string[];
    engagement?: string | string[];
    match?: string | string[];
    ownerAgent?: string | string[];
  } & QuerystringCommuteFiltering;
}
export type VolunteerListType = "card" | "table";

export type QuerystringVolunteerGetList = QuerystringPaginationLanguage &
  QuerystringVolunteerFiltering & { listType?: VolunteerListType };

export interface QuerystringUserList extends QuerystringPagination {
  search?: string;
  sortOrder?: SortOrder;
  role?: UserRole;
}

export type QuerystringPostList = ApiPostListQuery;
