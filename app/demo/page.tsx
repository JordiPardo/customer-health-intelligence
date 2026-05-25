import { redirect } from "next/navigation";
import { appPath, DEMO_PREFIX } from "@/lib/app-path";

export default function DemoIndexPage() {
  redirect(appPath(DEMO_PREFIX, "/dashboard"));
}
