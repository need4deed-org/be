import { Lang, OpportunitySortField, SortOrder, UserRole } from "need4deed-sdk";

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

// GET /event has neither pagination nor ordering, and language is optional
// (defaults to Lang.DE) rather than required — QuerystringPaginationLanguage
// doesn't fit.
export interface QuerystringEventGetList {
  language?: Lang;
}

// TODO: what about arrays?
export interface QuerystringOpportunityFiltering {
  filter?: {
    type: string;
    status: string;
    agentId?: number;
    search?: string;
    language?: string;
    german?: boolean;
    activity?: string;
    skill?: string;
    availability?: string;
    district?: string;
  };
}

export type QuerystringOpportunityGetList = QuerystringPaginationLanguage &
  QuerystringOpportunityFiltering;

export type QuerystringVolunteerOpportunityGetList =
  QuerystringPaginationLanguage & QuerystringOpportunityFiltering;

export type QuerystringOpportunityList = QuerystringPaginationLanguage &
  QuerystringOpportunityFiltering & {
    // Which field `sortOrder` applies to. Scoped to the opportunity list
    // only (not the shared QuerystringPaginationOrdering) — sorting by
    // start date only makes sense here, not for agent/volunteer/user lists.
    sortBy?: OpportunitySortField;
    // Calendar view (be#889): filter by Opportunity.onetimer.date range.
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
    availability?: string;
    district?: string | string[];
    engagement?: string | string[];
    match?: string | string[];
  };
}
export type VolunteerListType = "card" | "table";

export type QuerystringVolunteerGetList = QuerystringPaginationLanguage &
  QuerystringVolunteerFiltering & { listType?: VolunteerListType };

export interface QuerystringUserList extends QuerystringPagination {
  search?: string;
  sortOrder?: SortOrder;
  role?: UserRole;
}

export interface QuerystringPostList extends QuerystringPagination {
  search?: string;
}
