import { Mode, CreateModeInput, UpdateModeInput } from "../../types/Mode";

export function mapModeFromApi(apiMode: any): Mode {
  return {
    id: apiMode.id,
    title: apiMode.title,
    color: apiMode.color,
    position: apiMode.position ?? 0, // ✅ Default to 0 if missing
  };
}

export const mapModeToApi = (mode: Omit<Mode, "id">) => ({
  title: mode.title,
  color: mode.color,
});

// 🆕 For creating a new mode
export function mapCreateModeToApi(mode: CreateModeInput) {
  return {
    title: mode.title,
    color: mode.color,
    position: mode.position, // ✅ Add this line
  };
}

// 🆕 For updating an existing mode
export function mapUpdateModeToApi(mode: UpdateModeInput) {
  return {
    title: mode.title,
    color: mode.color,
  };
}
