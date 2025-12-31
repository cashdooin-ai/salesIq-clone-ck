import { useState } from 'react';
import { User, Bell, Shield, Palette } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';

export function Settings() {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'appearance'>('profile');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile(formData);
      // Show success message
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ] as const;

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r bg-background p-4">
        <h2 className="mb-4 px-2 text-lg font-semibold">Settings</h2>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl p-8">
          {activeTab === 'profile' && (
            <div>
              <h1 className="mb-6 text-2xl font-bold">Profile Settings</h1>

              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar
                    src={formData.avatar}
                    name={formData.name || formData.email}
                    size="xl"
                  />
                  <div>
                    <Button variant="outline" size="sm" className="mb-2">
                      Change Avatar
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG or GIF. Max size 2MB.
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium">
                    Full Name
                  </label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="Enter your email"
                    disabled
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Contact your administrator to change your email
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline">Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h1 className="mb-6 text-2xl font-bold">Notification Settings</h1>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">New Message Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you receive a new message
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">Sound Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Play sound when receiving notifications
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">Desktop Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Show desktop notifications for new messages
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important updates
                    </p>
                  </div>
                  <input type="checkbox" className="h-4 w-4" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h1 className="mb-6 text-2xl font-bold">Security Settings</h1>
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 font-medium">Change Password</h3>
                  <div className="space-y-3">
                    <Input type="password" placeholder="Current password" />
                    <Input type="password" placeholder="New password" />
                    <Input type="password" placeholder="Confirm new password" />
                  </div>
                  <Button variant="primary" className="mt-4">
                    Update Password
                  </Button>
                </div>

                <div className="border-t pt-6">
                  <h3 className="mb-2 font-medium">Two-Factor Authentication</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div>
              <h1 className="mb-6 text-2xl font-bold">Appearance Settings</h1>
              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 font-medium">Theme</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <button className="rounded-lg border-2 border-primary bg-white p-4 text-center">
                      <div className="mb-2 text-2xl">☀️</div>
                      <p className="text-sm font-medium">Light</p>
                    </button>
                    <button className="rounded-lg border bg-gray-900 p-4 text-center text-white">
                      <div className="mb-2 text-2xl">🌙</div>
                      <p className="text-sm font-medium">Dark</p>
                    </button>
                    <button className="rounded-lg border bg-gradient-to-br from-white to-gray-900 p-4 text-center">
                      <div className="mb-2 text-2xl">🔄</div>
                      <p className="text-sm font-medium">Auto</p>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 font-medium">Font Size</h3>
                  <div className="flex items-center gap-4">
                    <input type="range" min="12" max="18" defaultValue="14" className="flex-1" />
                    <span className="text-sm">14px</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
