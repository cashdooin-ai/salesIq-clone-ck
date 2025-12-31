import { h } from 'preact';
import { useState } from 'preact/hooks';
import { PreChatField, Visitor } from '../types';

interface PreChatFormProps {
  fields?: PreChatField[];
  onSubmit: (data: Partial<Visitor>) => void;
  primaryColor: string;
}

const DEFAULT_FIELDS: PreChatField[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
];

export function PreChatForm({ fields = DEFAULT_FIELDS, onSubmit, primaryColor }: PreChatFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      const value = formData[field.name];

      if (field.required && !value?.trim()) {
        newErrors[field.name] = `${field.label} is required`;
      } else if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.name] = 'Please enter a valid email';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    if (!validate()) return;

    // Convert form data to visitor data
    const visitorData: Partial<Visitor> = {
      name: formData.name,
      email: formData.email,
      customFields: {},
    };

    // Add custom fields
    fields.forEach(field => {
      if (field.name !== 'name' && field.name !== 'email') {
        visitorData.customFields![field.name] = formData[field.name];
      }
    });

    onSubmit(visitorData);
  };

  return (
    <div className="nexvo-prechat">
      <div className="nexvo-prechat-header">
        <h3>Welcome!</h3>
        <p>Please fill in the form below to start chatting</p>
      </div>

      <form className="nexvo-prechat-form" onSubmit={handleSubmit}>
        {fields.map(field => (
          <div key={field.name} className="nexvo-form-group">
            <label className="nexvo-form-label" htmlFor={`field-${field.name}`}>
              {field.label}
              {field.required && <span className="nexvo-form-required">*</span>}
            </label>

            {field.type === 'select' ? (
              <select
                id={`field-${field.name}`}
                className={`nexvo-form-input ${errors[field.name] ? 'nexvo-form-input-error' : ''}`}
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, (e.target as HTMLSelectElement).value)}
                required={field.required}
              >
                <option value="">Select...</option>
                {field.options?.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`field-${field.name}`}
                type={field.type}
                className={`nexvo-form-input ${errors[field.name] ? 'nexvo-form-input-error' : ''}`}
                value={formData[field.name] || ''}
                onInput={(e) => handleChange(field.name, (e.target as HTMLInputElement).value)}
                required={field.required}
                placeholder={`Enter your ${field.label.toLowerCase()}`}
              />
            )}

            {errors[field.name] && (
              <span className="nexvo-form-error">{errors[field.name]}</span>
            )}
          </div>
        ))}

        <button
          type="submit"
          className="nexvo-form-submit"
          style={{ backgroundColor: primaryColor }}
        >
          Start Chat
        </button>
      </form>
    </div>
  );
}
