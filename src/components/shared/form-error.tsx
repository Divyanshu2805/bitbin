interface FormErrorProps {
  message: string | null;
  children?: React.ReactNode;
}

export default function FormError({ message, children }: FormErrorProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
    >
      <p>{message}</p>
      {children}
    </div>
  );
}
