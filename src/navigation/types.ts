import type {NavigatorScreenParams} from '@react-navigation/native';
import type {CreateComplaintData} from '@/types';

export type ReportChatDraft = Pick<CreateComplaintData, 'title' | 'description' | 'category'> & {
  language: NonNullable<CreateComplaintData['language']>;
  originalReport: string;
};

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  PhoneLogin: undefined;
  OTP: {phone: string};
};

export type CitizenTabParamList = {
  Home: undefined;
  Map: undefined;
  Report: {chatDraft?: ReportChatDraft} | undefined;
  History: undefined;
  Profile: undefined;
};

export type CitizenStackParamList = {
  Tabs: NavigatorScreenParams<CitizenTabParamList>;
  ReportChat: undefined;
  ComplaintDetail: {id: string};
  Notifications: undefined;
  Settings: undefined;
  SavedLocations: undefined;
  Leaderboard: undefined;
};

export type OfficerTabParamList = {
  Dashboard: undefined;
  Queue: undefined;
  Assign: undefined;
  Analytics: undefined;
  Profile: undefined;
};

export type OfficerStackParamList = {
  Tabs: NavigatorScreenParams<OfficerTabParamList>;
  ComplaintDetail: {id: string};
  Notifications: undefined;
};

export type WorkerTabParamList = {
  Jobs: undefined;
  Navigate: undefined;
  Active: undefined;
  Profile: undefined;
};

export type WorkerStackParamList = {
  Tabs: NavigatorScreenParams<WorkerTabParamList>;
  JobDetail: {id: string};
  Notifications: undefined;
};

export type AdminTabParamList = {
  Overview: undefined;
  Complaints: {category?: string; zone?: string} | undefined;
  ComplaintMaps: undefined;
  Users: undefined;
  Reports: undefined;
  More: undefined;
};

export type AdminStackParamList = {
  Tabs: NavigatorScreenParams<AdminTabParamList>;
  Departments: undefined;
  Zones: undefined;
  Categories: undefined;
  Audit: undefined;
  ComplaintDetail: {id: string};
  Notifications: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Citizen: NavigatorScreenParams<CitizenStackParamList>;
  Officer: NavigatorScreenParams<OfficerStackParamList>;
  Worker: NavigatorScreenParams<WorkerStackParamList>;
  Admin: NavigatorScreenParams<AdminStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
