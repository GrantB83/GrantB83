export interface CliOptions {
  root?: string;
  catalog?: string;
  toolsDir?: string;
  outdir?: string;
}

export interface ToolDirectory {
  name: string;
  path: string;
}

export interface IndexEntry {
  slug: string;
  lineNumber: number;
}

export interface SectionHeading {
  name: string;
  lineNumber: number;
}

export interface CheckResult {
  healthy: boolean;
  onDiskNotInIndex: string[];
  inIndexNotOnDisk: string[];
  duplicateSections: Array<{ name: string; count: number; lines: number[] }>;
  indexDuplicates: Array<{ slug: string; count: number; lines: number[] }>;
  toolsOnDisk: string[];
  toolsInIndex: string[];
  sectionsFound: Array<{ name: string; line: number }>;
}
