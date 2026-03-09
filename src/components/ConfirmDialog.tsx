'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
    /** When false the trigger renders directly without a dialog */
    enabled?: boolean;
    children: React.ReactNode;
}

/**
 * Wraps a trigger element with an AlertDialog confirmation.
 * When `enabled` is false (e.g. no existing content), the trigger fires directly.
 */
export default function ConfirmDialog({
    title,
    description,
    confirmLabel = 'Continue',
    onConfirm,
    enabled = true,
    children,
}: ConfirmDialogProps) {
    if (!enabled) {
        return (
            <span onClick={onConfirm} className="contents">
                {children}
            </span>
        );
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">{title}</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-indigo-600 text-white hover:bg-indigo-500"
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
