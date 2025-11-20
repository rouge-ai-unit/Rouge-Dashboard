
export interface University {
  name: string;
  ktoTtoOffice: string;
  location: string;
  website: string | null;
  incubationRecord: {
    count: number;
    focus: string;
  };
}
