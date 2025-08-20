import { redirect } from "next/navigation";
export default function RootPage() {
  redirect("/signin");
  return null;
}
