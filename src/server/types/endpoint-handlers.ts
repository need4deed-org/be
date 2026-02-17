import { Lang } from "need4deed-sdk";

export interface ParamsId {
  id: number;
}

export type ReplyDataCount<T> = {
  message: string;
  data: T;
  count: number;
};

export type ReplyData<T> = Omit<ReplyDataCount<T>, "count">;

export interface QuerystringPagination {
  page?: number;
  limit?: number;
}

export interface QuerystringPaginationLanguage extends QuerystringPagination {
  language: Lang;
}

// TODO: what about arrays?
export interface QuerystringOpportunityFiltering {
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
