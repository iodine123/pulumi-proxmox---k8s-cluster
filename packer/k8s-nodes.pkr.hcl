packer {
  required_plugins {
    proxmox = {
      version = ">= 1.1.2"
      source  = "github.com/hashicorp/proxmox"
    }
  }
}

# --- SOURCE MASTER (ID 9001) ---
source "proxmox-iso" "k8s_master" {
  proxmox_url = "${var.proxmox_api_url}"
  username    = "${var.proxmox_api_token_id}"
  token       = "${var.proxmox_api_token_secret}"
  insecure_skip_tls_verify = true

  cpu_type     = "host"
  memory       = 2048
  cores        = 2

  node         = "pve-lab"
  vm_id        = 9001
  vm_name      = "tpl-k8s-master"
  iso_file     = "local:iso/debian-12.0.0.iso"

  network_adapters { 
    bridge  = "vmbr0"
    model   = "virtio" 
    }
  disks { 
    disk_size     = "20G" 
    storage_pool  = "local-lvm"
    type          = "scsi" 
    }

  http_directory       = "http"
  http_bind_address    = "192.168.198.1" 
  http_port_min        = 8063
  http_port_max        = 8070
  boot_command         = [
    "<esc><wait>",
    "install auto=true ",
    "priority=critical ",
    "vga=788 ",
    "url=http://{{ .HTTPIP }}:{{ .HTTPPort }}/preseed.cfg ",
    "hostname=k8s-node ",
    "domain=local ",
    "interface=auto ",
    "<enter>"
  ]
  ssh_pty                 = true
  ssh_username            = "admin123"
  ssh_password            = "password123"
  ssh_timeout             = "20m"
}

# --- SOURCE WORKER (ID 9002) ---
source "proxmox-iso" "k8s_worker" {
  proxmox_url = "${var.proxmox_api_url}"
  username    = "${var.proxmox_api_token_id}"
  token       = "${var.proxmox_api_token_secret}"
  insecure_skip_tls_verify = true

  cpu_type     = "host"
  memory       = 2048
  cores        = 2

  node         = "pve-lab"
  vm_id        = 9002
  vm_name      = "tpl-k8s-worker"
  iso_file     = "local:iso/debian-12.0.0.iso"

  network_adapters { 
    bridge  = "vmbr0"
    model   = "virtio" 
    }
  disks { 
    disk_size     = "15G"
    storage_pool  = "local-lvm"
    type          = "scsi" 
    }

  http_directory       = "http"
  http_bind_address    = "192.168.198.1" 
  http_port_min        = 8063
  http_port_max        = 8070
  boot_command         = [
    "<esc><wait>",
    "install auto=true ",
    "priority=critical ",
    "vga=788 ",
    "url=http://{{ .HTTPIP }}:{{ .HTTPPort }}/preseed.cfg ",
    "hostname=k8s-node ",
    "domain=local ",
    "interface=auto ",
    "<enter>"
  ]
  ssh_pty                 = true
  ssh_username            = "admin123"
  ssh_password            = "password123"
  ssh_timeout             = "20m"
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