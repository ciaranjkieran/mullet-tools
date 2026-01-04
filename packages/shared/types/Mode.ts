export type Mode = {
  id: number;
  title: string;
  color: string;
  position: number;
};

export type CreateModeInput = {
  title: string;
  color: string;
  position: number;
};

export type UpdateModeInput = {
  id: number;
  title: string;
  color: string;
};
