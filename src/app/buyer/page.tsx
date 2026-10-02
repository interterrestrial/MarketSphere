import { OverviewPage } from "@/components/auth/overview-page";

export default function BuyerPage() {
  return (
    <OverviewPage
      role="BUYER"
      profileHref="/buyer/profile"
      comingSoon="Product discovery, order requests, and request history arrive in the next phases."
    />
  );
}
