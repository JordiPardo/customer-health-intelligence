import { PlaybooksView } from "@/components/views/playbooks-view";
import { DEMO_PREFIX } from "@/lib/app-path";

export default function DemoPlaybooksPage() {
  return <PlaybooksView base={DEMO_PREFIX} />;
}
