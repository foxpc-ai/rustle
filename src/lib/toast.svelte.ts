type ToastType = 'error' | 'success' | 'info';

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}

let counter = 0;

class ToastStore {
    items = $state<ToastItem[]>([]);

    private push(message: string, type: ToastType, duration = 4000) {
        const id = ++counter;
        this.items.push({ id, message, type });

        setTimeout(() => {
            this.items = this.items.filter(t => t.id !== id);
        }, duration);
    }

    error(message: string) { this.push(message, 'error'); }
    success(message: string) { this.push(message, 'success'); }
    info(message: string) { this.push(message, 'info'); }

    dismiss(id: number) {
        this.items = this.items.filter(t => t.id !== id);
    }
}

export const toast = new ToastStore();
