# --- SOURCE MASTER (ID 9001) ---
source "proxmox-iso" "k8s_master" {
  proxmox_url = "${var.proxmox_api_url}"
  username    = "${var.proxmox_api_token_id}"
  token       = "${var.proxmox_api_token_secret}"
  insecure_skip_tls_verify = true

  node                 = "pve-lab"
  vm_id                = 9001
  vm_name              = "tpl-k8s-master"
  iso_file             = "local:iso/debian-12-amd64-netinst.iso"
  iso_storage_pool     = "local"

  network_adapters { bridge = "vmbr0"; model = "virtio" }
  disks { disk_size = "20G"; storage_pool = "local-lvm"; type = "scsi" }

  http_directory = "http"
  boot_command   = ["<esc><wait>auto url=http://{{ .HTTPIP }}:{{ .HTTPPort }}/preseed.cfg<enter>"]
  ssh_username   = "admin"; ssh_password = "password123"; ssh_timeout = "20m"
}

# --- SOURCE WORKER (ID 9002) ---
source "proxmox-iso" "k8s_worker" {
  proxmox_url = "${var.proxmox_api_url}"
  username    = "${var.proxmox_api_token_id}"
  token       = "${var.proxmox_api_token_secret}"
  insecure_skip_tls_verify = true

  node                 = "pve-lab"
  vm_id                = 9002
  vm_name              = "tpl-k8s-worker"
  iso_file             = "local:iso/debian-12-amd64-netinst.iso"
  iso_storage_pool     = "local"

  network_adapters { bridge = "vmbr0"; model = "virtio" }
  disks { disk_size = "15G"; storage_pool = "local-lvm"; type = "scsi" } # Worker bisa disk lebih kecil

  http_directory = "http"
  boot_command   = ["<esc><wait>auto url=http://{{ .HTTPIP }}:{{ .HTTPPort }}/preseed.cfg<enter>"]
  ssh_username   = "admin"; ssh_password = "password123"; ssh_timeout = "20m"
}

# --- BUILD ---
build {
  sources = ["source.proxmox-iso.k8s_master", "source.proxmox-iso.k8s_worker"]

  provisioner "shell" {
    script = "scripts/common.sh"
  }

  provisioner "shell" {
    only   = ["proxmox-iso.k8s_master"]
    script = "scripts/master.sh"
  }

  provisioner "shell" {
    inline = ["sudo apt-get clean", "sudo rm -rf /var/lib/apt/lists/*"]
  }
}