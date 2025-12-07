import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
    text: string;
    className?: string;
    size?: number;
    showText?: boolean;
}

const CopyButton = ({ text, className = '', size = 14, showText = false }: CopyButtonProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 p-1.5 rounded-md transition-all duration-200 ${copied
                    ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                    : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                } ${className}`}
            title={copied ? 'Copié !' : 'Copier'}
        >
            {copied ? (
                <Check size={size} />
            ) : (
                <Copy size={size} />
            )}
            {showText && (
                <span className="text-xs font-medium">
                    {copied ? 'Copié !' : 'Copier'}
                </span>
            )}
        </button>
    );
};

export default CopyButton;
