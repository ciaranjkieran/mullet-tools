export type CollaboratorUser = {
  id: number;
  username: string;
  email: string;
  profile: {
    displayName: string;
    avatar: string | null;
  } | null;
};

export type ModeCollaborator = {
  id: number;
  user: CollaboratorUser;
  role: "editor" | "viewer";
  created_at: string;
};

export type ModeInvitation = {
  id: number;
  email: string;
  role: "editor" | "viewer";
  status: "pending" | "accepted" | "declined";
  modeTitle: string;
  modeColor: string;
  modeId: number;
  invitedBy: CollaboratorUser;
  created_at: string;
};

export type ModeCollaboratorsResponse = {
  collaborators: ModeCollaborator[];
  pendingInvitations: ModeInvitation[];
};

export type ModeMember = {
  id: number;
  username: string;
  displayName: string;
  avatar: string | null;
  role: "owner" | "editor" | "viewer";
};

export type ModeMembersResponse = {
  members: ModeMember[];
};
