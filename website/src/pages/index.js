import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const FEATURES = [
  ['Self-service, safely', 'Customers manage only their own VMs and containers: power, snapshots, console, usage graphs. The browser never sees Proxmox or its API token.'],
  ['Create, reinstall, resize', 'Linux (cloud-init) and Windows (guest agent) servers from your templates and plans, with image import from cloud images, OVA, ISO and VMDK.'],
  ['Snapshots and backups', 'Automatic snapshots per server, and restore points on Proxmox Backup Server: back up now, browse files, restore as a new server.'],
  ['Several clusters, one panel', 'Connect more Proxmox clusters, see nodes, alerts and jobs on one overview, and roll out OS updates in rings with a maintenance window.'],
  ['Network, public IPs and storage', 'A private SDN network per customer, WireGuard or Tailscale, public IPv4 (optionally IPv6 /64) with reverse DNS, block volumes with tiers and S3 object storage.'],
  ['Plans and billing', 'Plans with monthly prices, wallet, renewals, invoices with PPN, and Xendit, Midtrans or bank transfer.'],
  ['Support built in', 'Ticket desk with queues, a knowledge base, optional Zammad sync and an AI assistant for customers.'],
  ['Modern sign-in', 'Passwords with TOTP 2FA, passkeys, OpenID Connect and Google, Microsoft or GitHub, plus API tokens for scripts.'],
  ['Easy to run', 'One container for amd64 and arm64: Docker Compose, Portainer or a NAS. Releases and update checks built in.'],
];

const SHOTS = [
  ['customer-dashboard.png', 'Customer dashboard'],
  ['admin-dashboard.png', 'Admin overview'],
  ['customer-snapshots.png', 'Snapshots and automatic snapshots'],
  ['admin-clusters-hosts.png', 'Clusters and hosts'],
];

export default function Home() {
  const base = useBaseUrl('/');
  return (
    <Layout title="Self-service portal for Proxmox VE" description="PVE Panel: a modern self-service portal for Proxmox VE">
      <header className={styles.hero}>
        <div className="container">
          <h1 className={styles.title}>PVE Panel</h1>
          <p className={styles.tagline}>
            A modern self-service portal for Proxmox VE. Give customers a clean, secure interface to
            manage <strong>only their own</strong> virtual machines and containers.
          </p>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to="/docs/getting-started/quick-start">Quick start</Link>
            <Link className="button button--secondary button--lg" to="/docs/intro">Documentation</Link>
            <Link className={`button button--outline button--lg ${styles.ghost}`} href="https://github.com/hawaianblue21/pve-panel">GitHub</Link>
          </div>
        </div>
      </header>
      <main>
        <section className="container">
          <div className={styles.grid}>
            {FEATURES.map(([title, text]) => (
              <div key={title} className={styles.card}>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <div className={styles.shots}>
            {SHOTS.map(([file, alt]) => (
              <figure key={file} className={styles.figure}>
                <img className="screenshot" src={`${base}${file}`} alt={alt} loading="lazy" />
                <figcaption>{alt}</figcaption>
              </figure>
            ))}
          </div>
          <p className={styles.note}>
            Built with substantial AI assistance — see <Link to="/docs/about/ai-assisted-development">AI-assisted development</Link>.
          </p>
        </section>
      </main>
    </Layout>
  );
}
