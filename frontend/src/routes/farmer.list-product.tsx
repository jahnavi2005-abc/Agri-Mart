import { RoleRoute } from "@/components/RoleRoute";
import { useAuth } from "@/hooks/useAuth";
import { createProduct } from "@/lib/products";
import { uploadCropImage } from "@/lib/uploads";
import type { CreateProductInput } from "@/types/product";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, ImagePlus, Package, Sprout } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/farmer/list-product")({
  component: () => (
    <RoleRoute allowed={["farmer"]}>
      <ListProductPage />
    </RoleRoute>
  ),
});

const categories = ["Grains", "Vegetables", "Fruits", "Spices", "Pulses", "Oilseeds"];
const states = [
  "Andhra Pradesh",
  "Telangana",
  "Karnataka",
  "Tamil Nadu",
  "Maharashtra",
  "Madhya Pradesh",
  "Haryana",
];

type FormState = {
  listing_type: string;
  crop_name: string;
  category: string;
  description: string;
  quantity_kg: string;
  price_per_kg: string;
  minimum_order_kg: string;
  maximum_order_kg: string;
  grade: string;
  is_organic: boolean;
  harvest_date: string;
  district: string;
  state: string;
  pickup: boolean;
  delivery: boolean;
  packaging_info: string;
  image_urls: string;
  price_negotiable: boolean;
  auction_end_at: string;
  auction_min_bid: string;
};

const initialForm: FormState = {
  listing_type: "fixed",
  crop_name: "",
  category: "Grains",
  description: "",
  quantity_kg: "",
  price_per_kg: "",
  minimum_order_kg: "1",
  maximum_order_kg: "",
  grade: "A",
  is_organic: false,
  harvest_date: "",
  district: "",
  state: "Andhra Pradesh",
  pickup: true,
  delivery: false,
  packaging_info: "",
  image_urls: "",
  price_negotiable: false,
  auction_end_at: "",
  auction_min_bid: "",
};

function ListProductPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();

  const imagePreview = useMemo(() => parseImages(form.image_urls)[0], [form.image_urls]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const publicUrl = await uploadCropImage(file);
      setForm((current) => ({
        ...current,
        image_urls: [current.image_urls, publicUrl].filter(Boolean).join("\n"),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    const quantity = Number(form.quantity_kg);
    const price = Number(form.price_per_kg);
    const minimum = Number(form.minimum_order_kg);
    const maximum = form.maximum_order_kg ? Number(form.maximum_order_kg) : null;

    if (!form.crop_name.trim() || !form.district.trim()) {
      setError("Crop name and district are required.");
      return;
    }

    if (!quantity || quantity <= 0 || !price || price <= 0 || !minimum || minimum <= 0) {
      setError("Quantity, price, and minimum order must be positive numbers.");
      return;
    }

    if (maximum !== null && maximum < minimum) {
      setError("Maximum order must be greater than minimum order.");
      return;
    }

    const payload: CreateProductInput = {
      crop_name: form.crop_name.trim(),
      category: form.category,
      description: form.description.trim() || undefined,
      quantity_kg: quantity,
      price_per_kg: price,
      minimum_order_kg: minimum,
      maximum_order_kg: maximum,
      grade: form.grade || undefined,
      is_organic: form.is_organic,
      harvest_date: form.harvest_date || undefined,
      district: form.district.trim(),
      state: form.state,
      delivery_options: {
        pickup: form.pickup,
        delivery: form.delivery,
      },
      packaging_info: form.packaging_info.trim() || undefined,
      image_urls: parseImages(form.image_urls),
      price_negotiable: form.price_negotiable,
      listing_type: form.listing_type,
      ...(form.listing_type === "auction"
        ? {
            auction_end_at: new Date(form.auction_end_at).toISOString(),
            auction_min_bid: Number(form.auction_min_bid),
          }
        : {}),
    };

    setError("");
    setLoading(true);
    try {
      const product = await createProduct(payload, profile);
      navigate({ to: "/listings/$id", params: { id: product.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create listing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/dashboard/farmer"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary">Farmer Listing</div>
            <h1 className="font-display text-3xl font-bold md:text-5xl">List a crop</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Add enough quality, price, stock, and location detail for buyers to trust the listing.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Section icon={<Sprout className="h-4 w-4" />} title="Crop details">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Crop name">
                  <input
                    value={form.crop_name}
                    onChange={(e) => update("crop_name", e.target.value)}
                    className="input"
                    placeholder="Sona Masuri Rice"
                  />
                </Field>
                <Field label="Category">
                  <select
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                    className="input"
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Grade">
                  <select
                    value={form.grade}
                    onChange={(e) => update("grade", e.target.value)}
                    className="input"
                  >
                    <option>A</option>
                    <option>B</option>
                    <option>C</option>
                    <option>Standard</option>
                  </select>
                </Field>
                <Field label="Harvest date">
                  <input
                    value={form.harvest_date}
                    onChange={(e) => update("harvest_date", e.target.value)}
                    type="date"
                    className="input"
                  />
                </Field>
              </div>
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  className="input min-h-28 resize-y"
                  placeholder="Quality, variety, moisture level, farm practices..."
                />
              </Field>
            </Section>

            <Section icon={<Package className="h-4 w-4" />} title="Pricing and stock">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Listing Type">
                  <select
                    value={form.listing_type}
                    onChange={(e) => update("listing_type", e.target.value)}
                    className="input"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="auction">Live Auction</option>
                  </select>
                </Field>
                <div className="hidden md:block"></div>

                <Field
                  label={form.listing_type === "auction" ? "Starting Price per kg" : "Price per kg"}
                >
                  <input
                    value={form.price_per_kg}
                    onChange={(e) => update("price_per_kg", e.target.value)}
                    type="number"
                    min="1"
                    className="input"
                    placeholder="28"
                  />
                </Field>
                <Field label="Total quantity kg">
                  <input
                    value={form.quantity_kg}
                    onChange={(e) => update("quantity_kg", e.target.value)}
                    type="number"
                    min="1"
                    className="input"
                    placeholder="1200"
                  />
                </Field>

                {form.listing_type === "auction" && (
                  <>
                    <Field label="Minimum Bid Amount (₹)">
                      <input
                        value={form.auction_min_bid}
                        onChange={(e) => update("auction_min_bid", e.target.value)}
                        type="number"
                        min={form.price_per_kg || 1}
                        className="input"
                        placeholder="e.g. 30"
                      />
                    </Field>
                    <Field label="Auction End Date & Time">
                      <input
                        value={form.auction_end_at}
                        onChange={(e) => update("auction_end_at", e.target.value)}
                        type="datetime-local"
                        className="input"
                      />
                    </Field>
                  </>
                )}

                <Field label="Minimum order kg">
                  <input
                    value={form.minimum_order_kg}
                    onChange={(e) => update("minimum_order_kg", e.target.value)}
                    type="number"
                    min="1"
                    className="input"
                  />
                </Field>
                <Field label="Maximum order kg">
                  <input
                    value={form.maximum_order_kg}
                    onChange={(e) => update("maximum_order_kg", e.target.value)}
                    type="number"
                    min="1"
                    className="input"
                    placeholder="Optional"
                  />
                </Field>
              </div>
              <Field label="Packaging info">
                <input
                  value={form.packaging_info}
                  onChange={(e) => update("packaging_info", e.target.value)}
                  className="input"
                  placeholder="Loose, 50 kg bags, 10 kg crates"
                />
              </Field>
            </Section>

            <Section icon={<ImagePlus className="h-4 w-4" />} title="Photos and location">
              <Field label="Upload crop photo">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => uploadImage(e.target.files?.[0])}
                  className="input file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Uses the Supabase Edge Function `upload-presign` after it is deployed.
                </p>
              </Field>
              <Field label="Image URLs">
                <textarea
                  value={form.image_urls}
                  onChange={(e) => update("image_urls", e.target.value)}
                  className="input min-h-24 resize-y"
                  placeholder="Paste one image URL per line for now. S3 upload comes in the backend upload phase."
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="District">
                  <input
                    value={form.district}
                    onChange={(e) => update("district", e.target.value)}
                    className="input"
                    placeholder="Guntur"
                  />
                </Field>
                <Field label="State">
                  <select
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                    className="input"
                  >
                    {states.map((state) => (
                      <option key={state}>{state}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>
          </div>

          <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
            <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-secondary">
              {imagePreview ? (
                <img src={imagePreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
                  Image preview
                </div>
              )}
            </div>

            <div className="mt-5 space-y-3">
              <Toggle
                label="Organic crop"
                checked={form.is_organic}
                onChange={(value) => update("is_organic", value)}
              />
              <Toggle
                label="Price negotiable"
                checked={form.price_negotiable}
                onChange={(value) => update("price_negotiable", value)}
              />
              <Toggle
                label="Pickup available"
                checked={form.pickup}
                onChange={(value) => update("pickup", value)}
              />
              <Toggle
                label="Delivery available"
                checked={form.delivery}
                onChange={(value) => update("delivery", value)}
              />
            </div>

            {error && (
              <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground press shadow-glow disabled:opacity-60"
            >
              {loading ? "Publishing..." : "Publish listing"} <Check className="h-4 w-4" />
            </button>
          </aside>
        </form>
      </div>

      <style>{`.input{width:100%;background:var(--input);border:1px solid var(--border);border-radius:12px;padding:14px 16px;outline:none;transition:all .2s}.input:focus{border-color:var(--primary);box-shadow:var(--shadow-glow)}`}</style>
    </div>
  );
}

function parseImages(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-5 flex items-center gap-2 font-display text-lg font-bold">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/15 text-primary">
          {icon}
        </span>
        {title}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary p-3 text-left"
    >
      <span className="text-sm font-semibold">{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-primary" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </span>
    </button>
  );
}
