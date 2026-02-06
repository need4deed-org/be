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

export type QuerystringOpportunityGetList = QuerystringPagination &
  QuerystringOpportunityFiltering;

export type QuerystringVolunteerOpportunityGetList = QuerystringPagination &
  QuerystringOpportunityFiltering;
