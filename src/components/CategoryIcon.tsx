import {
  Car,
  Film,
  GraduationCap,
  Receipt,
  Utensils,
} from 'lucide-react';
import { Category } from '../types/finance';
import { CATEGORY_META } from '../lib/format';

interface CategoryIconProps {
  category: Category;
  size?: 'sm' | 'md';
}

export function CategoryIcon({ category, size = 'md' }: CategoryIconProps) {
  const meta = CATEGORY_META[category];
  const boxSize = size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]';

  const renderIcon = () => {
    switch (category) {
      case 'Alimentação':
        return <Utensils className={iconSize} strokeWidth={1.9} />;
      case 'Transporte':
        return <Car className={iconSize} strokeWidth={1.9} />;
      case 'Educação':
        return <GraduationCap className={iconSize} strokeWidth={1.9} />;
      case 'Lazer':
        return <Film className={iconSize} strokeWidth={1.9} />;
      case 'Outros':
      default:
        return <Receipt className={iconSize} strokeWidth={1.9} />;
    }
  };

  return (
    <div
      className={`${boxSize} ${meta.iconBg} ${meta.iconText} flex items-center justify-center shrink-0 transition-colors`}
      aria-hidden="true"
    >
      {renderIcon()}
    </div>
  );
}
