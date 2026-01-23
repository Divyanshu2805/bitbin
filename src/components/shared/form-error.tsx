interface FormErrorProps {
  message: string | null;
  children?: React.ReactNode;
}

export default function FormError({ message, children }: FormErrorProps) {
  if (!message) return null;

  return (
    <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
      <p>{message}</p>
      {children}
    </div>
  );
}
