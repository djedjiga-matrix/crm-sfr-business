import { type ReactNode } from 'react';

interface TooltipProps {
    children: ReactNode;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip = ({ children, content, position = 'top' }: TooltipProps) => {
    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <div className="relative group flex items-center justify-center">
            {children}
            <div className={`absolute ${positionClasses[position]} hidden group-hover:block z-50 whitespace-nowrap pointer-events-none`}>
                <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wide">
                    {content}
                </div>
            </div>
        </div>
    );
};

export default Tooltip;
