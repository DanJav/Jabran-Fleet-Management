import { requireAdmin } from "@/lib/auth";
import { VehicleForm } from "@/components/vehicles/vehicle-form";

export default async function NewVehiclePage() {
  await requireAdmin();
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Lägg till fordon</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fyll i uppgifter om fordonet. Du kan även söka via registreringsnummer.
        </p>
      </div>
      <VehicleForm />
    </div>
  );
}
