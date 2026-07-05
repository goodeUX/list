import BenefitsModal, { type BenefitItem } from '@/components/BenefitsModal';
import { FREE_LIST_LIMIT } from '@/lib/listLimits';

const BENEFITS: BenefitItem[] = [
  { icon: 'all-inclusive', text: 'Unlimited lists' },
  { icon: 'sync', text: 'Everything in Free, no limits' },
];

type UpgradePromptModalProps = {
  visible: boolean;
  /** False on web/Expo Go, where the purchase can't happen on this device. */
  purchasesAvailable: boolean;
  onUpgrade: () => void;
  onDismiss: () => void;
};

export default function UpgradePromptModal({
  visible,
  purchasesAvailable,
  onUpgrade,
  onDismiss,
}: UpgradePromptModalProps) {
  return (
    <BenefitsModal
      benefits={BENEFITS}
      onDismiss={onDismiss}
      onPrimary={purchasesAvailable ? onUpgrade : onDismiss}
      primaryLabel={purchasesAvailable ? 'Upgrade to Premium' : 'Got it'}
      subtitle={
        purchasesAvailable
          ? `The Free plan includes ${FREE_LIST_LIMIT} lists (yours and shared ones). Go Premium for unlimited:`
          : `The Free plan includes ${FREE_LIST_LIMIT} lists. Upgrade from the mobile app to unlock unlimited lists.`
      }
      title="Create more lists"
      visible={visible}
    />
  );
}
