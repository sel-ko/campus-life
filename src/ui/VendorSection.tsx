import { useEffect, useState } from 'react';
import { getLocation, university, type CampusLocation } from '../content/university';
import { naira } from '../game/legacy/format';
import { track } from '../online/analytics';
import { fetchVendors, onlineConfigured, type Vendor } from '../online/supabase';
import { GAME_NAME, whatsappLink } from './site';

/** How many stall spaces each place has. Empty ones show "Stall available". */
const STALLS_PER_LOCATION = 2;

function orderMessage(vendor: Vendor, homeId: string): string {
  const home = getLocation(homeId)?.name ?? 'campus';
  return `Hello ${vendor.name}! I found your stall in ${GAME_NAME}. I'd like to order. I stay at ${home}.`;
}

function advertiseMessage(location: CampusLocation): string {
  return `Hello! I'd like to advertise my business at ${location.name} in ${GAME_NAME} (${university.shortName}). How much is a stall?`;
}

export function VendorCard({ vendor, homeId }: { vendor: Vendor; homeId: string }) {
  useEffect(() => track('vendor_viewed', { vendor_id: vendor.id }), [vendor.id]);
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-line bg-night p-3">
      <div>
        <p className="font-bold">{vendor.name}</p>
        {vendor.description && <p className="text-sm text-muted">{vendor.description}</p>}
      </div>
      {vendor.items.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {vendor.items.map((item) => (
            <li key={item.name} className="flex justify-between gap-2">
              <span>{item.name}</span>
              <span className="font-semibold text-sun">{naira(item.price)}</span>
            </li>
          ))}
        </ul>
      )}
      <a
        href={whatsappLink(orderMessage(vendor, homeId), vendor.whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('vendor_order_tapped', { vendor_id: vendor.id })}
        className="flex min-h-11 items-center justify-center rounded-lg bg-[#25D366] font-bold text-night"
      >
        Order on WhatsApp
      </a>
    </li>
  );
}

/** "Real vendors here": shown only when the vendor list loaded. */
export function VendorSection({ location, homeId }: { location: CampusLocation; homeId: string }) {
  const [vendors, setVendors] = useState<Vendor[] | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchVendors().then((list) => alive && setVendors(list));
    return () => {
      alive = false;
    };
  }, []);

  if (!onlineConfigured() || vendors === null) return null;

  const here = vendors.filter((v) => v.locationId === location.id);
  const empty = Math.max(0, STALLS_PER_LOCATION - here.length);
  const adNumber = import.meta.env.VITE_ADVERTISE_WHATSAPP;

  return (
    <section className="flex flex-col gap-2 border-t border-line pt-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Real vendors here</h3>
      <ul className="flex flex-col gap-2">
        {here.map((v) => (
          <VendorCard key={v.id} vendor={v} homeId={homeId} />
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <li key={`empty-${i}`} className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-line p-3">
            <span className="text-sm text-muted">Stall available</span>
            {adNumber && (
              <a
                href={whatsappLink(advertiseMessage(location), adNumber)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('advertise_tapped', { location_id: location.id })}
                className="flex min-h-11 items-center rounded-lg border border-sun px-3 text-sm font-semibold text-sun"
              >
                Advertise here
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
