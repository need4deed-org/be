import { Lang, SortOrder } from "need4deed-sdk";

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
  QuerystringOpportunityFiltering;

export interface QuerystringAgentFiltering {}

export type QuerystringAgentGetList = QuerystringPaginationLanguage &
  QuerystringAgentFiltering;

export interface QuerystringVolunteerFiltering {
  filter?: {
    type: string;
    search?: string;
    language?: string;
    activity?: string;
    skill?: string;
    availability?: string;
    district?: string;
    engagement: string | string[];
    accompanying?: boolean;
  };
}
export type QuerystringVolunteerGetList = QuerystringPaginationLanguage &
  QuerystringVolunteerFiltering;
