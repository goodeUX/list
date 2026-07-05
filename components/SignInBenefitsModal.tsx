import BenefitsModal, { type BenefitItem } from '@/components/BenefitsModal';

// Signing up no longer unlocks extra lists (the free plan keeps the same
// 2-list cap) — the pitch is sync/share, with Premium for unlimited.
const BENEFITS: BenefitItem[] = [
  { icon: 'sync', text: 'Sync your lists across devices' },
  { icon: 'group-add', text: 'Invite others to collaborate' },
  { icon: 'workspace-premium', text: 'Go Premium for unlimited lists' },
];

type SignInBenefitsModalProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  onSignIn: () => void;
  onDismiss: () => void;
};

export default function SignInBenefitsModal({
  visible,
  title,
  subtitle,
  onSignIn,
  onDismiss,
}: SignInBenefitsModalProps) {
  return (
    <BenefitsModal
      benefits={BENEFITS}
      onDismiss={onDismiss}
      onPrimary={onSignIn}
      primaryLabel="Log in or sign up"
      subtitle={subtitle}
      title={title}
      visible={visible}
    />
  );
}
