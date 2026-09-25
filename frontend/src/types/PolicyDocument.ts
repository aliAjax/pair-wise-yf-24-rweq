export interface PolicyDocument {
  id: number;
  title: string;
  version_label: string;
  raw_text: string;
  normalized_sections: string;
  imported_at: string;
  status: string;
  archived_by: string | null;
  archived_at: string | null;
  restored_by: string | null;
  restored_at: string | null;
}
