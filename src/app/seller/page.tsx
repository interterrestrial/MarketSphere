import { OverviewPage } from "@/components/auth/overview-page";

export default function SellerPage() {
  return (
    <OverviewPage
      role="SELLER"
      profileHref="/seller/profile"
      comingSoon="Product catalogues and incoming order requests arrive in the next phases."
    />
  );
}
