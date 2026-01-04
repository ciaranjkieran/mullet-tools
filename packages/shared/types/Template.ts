// @shared/types/Template.ts

// 🔹 Template Types
export type TemplateType = "milestone" | "project";

// 🔹 Recursive Milestone Data Structure (saved in DB)
export type TemplateMilestoneData = {
  /** Title of the milestone or sub-milestone */
  title: string;

  /** Tasks under this milestone */
  tasks: string[];

  /** Child sub-milestones, supports recursive nesting */
  subMilestones: TemplateMilestoneData[];
};

export type TemplateProjectData = {
  /** Project title */
  title: string;
  description?: string;

  /** Simple tasks under this project */
  tasks: string[];

  /** Nested sub-projects */
  subProjects: TemplateProjectData[];

  /** Nested milestones attached to this project */
  subMilestones: TemplateMilestoneData[];
};

export type Template =
  | {
      id: number;
      title: string;
      type: "milestone";
      mode: number;
      tags: string[];
      data: TemplateMilestoneData;
      createdAt: string;
    }
  | {
      id: number;
      title: string;
      type: "project";
      mode: number;
      tags: string[];
      data: TemplateProjectData;
      createdAt: string;
    };

// 🔹 Input for creating a new template

export type CreateTemplateInput =
  | {
      title: string;
      type: "milestone";
      mode: number;
      data: TemplateMilestoneData;
    }
  | {
      title: string;
      type: "project";
      mode: number;
      data: TemplateProjectData;
    };

// 🔹 Input type used in forms before saving (matches your form state)
export type SubMilestoneInput = {
  /** Title of the sub-milestone */
  title: string;

  /** Tasks under this sub-milestone */
  tasks: string[];

  /** Nested sub-milestones */
  subMilestones: SubMilestoneInput[];
};

export type SubProjectInput = {
  /** Title of the sub-project */
  title: string;

  /** Optional description of the project */
  description?: string;

  /** Tasks under this project */
  tasks: string[];

  /** Nested sub-projects */
  subProjects: SubProjectInput[];

  /** Nested milestones */
  milestones: SubMilestoneInput[];
};
