import * as pulumi from "@pulumi/pulumi";
import * as proxmox from "@muhlba91/pulumi-proxmoxve";
import * as dotenv from "dotenv";
import { count } from "console";

dotenv.config();

const masters: proxmox.vm.VirtualMachine[] = [];
const workers: proxmox.vm.VirtualMachine[] = [];

const proxmoxProvider = new proxmox.Provider("my-proxmox", {
    endpoint: process.env.PROXMOX_VE_ENDPOINT,
    username: process.env.PROXMOX_VE_USERNAME,
    password: process.env.PROXMOX_VE_PASSWORD,
    insecure: true,
});

// Config cluster parameters
const cluster_config = {
    master: {
        count: 1,
        cpu: 2,
        memory: 4096,
        diskSize: 20,
        ip_start: 50
    },
    worker: {
        count: 2,
        cpu: 2,
        memory: 2048,
        diskSize: 20,
        ip_start: 60
    },
    network: {
        gateway: "192.168.10.1",
        subnet: "192.168.10"
    }
}

// Create a new Proxmox VE virtual machine for the Kubernetes master node
for (let i = 1; i <= cluster_config.master.count; i++) {
    const vm =new proxmox.vm.VirtualMachine(`k8s-master-${i}`, {
        nodeName: "pve-lab",      
        // @ts-ignore  
        clone: {
            vmId: 9001, 
            full: true,
        },
        cpu: {
            type: "host",
            cores: cluster_config.master.cpu,
        },
        memory: {
            dedicated: cluster_config.master.memory,
        },
        disks: [{
            datastoreId: "local-lvm",
            size: cluster_config.master.diskSize,
            interface: "scsi0",      
        }],
        networkDevices: [{
            bridge: "vmbr0",
            model: "virtio",
        }],
        // @ts-ignore
        initialization: {
            datastoreId: "local-lvm",
            userAccount: {
                username: "iodine",
                password: "password123",
            },
            ipConfigs: [{
                ipv4: {
                    address: `${cluster_config.network.subnet}.${cluster_config.master.ip_start + i}/24`,       
                    gateway: cluster_config.network.gateway,
                },
            }],
        },


    }, { provider: proxmoxProvider } as any);
    masters.push(vm);
}

for (let i = 1; i <= cluster_config.worker.count; i++) {
    const vm = new proxmox.vm.VirtualMachine(`k8s-worker-${i}`, {
        nodeName: "pve-lab",
        // @ts-ignore
        clone: {
            vmId: 9002,
            full: true,
        },
        cpu: {
            type: "host",
            cores: cluster_config.master.cpu,
        },
        memory: {
            dedicated: cluster_config.worker.memory,
        },
        disks: [{
            datastoreId: "local-lvm",
            size: cluster_config.worker.diskSize,
            interface: "scsi0",      
        }],
        networkDevices: [{
            bridge: "vmbr0",
            model: "virtio",
        }],
        // @ts-ignore
        initialization: {
            datastoreId: "local-lvm",
            userAccount: {
                username: "iodine",
                password: "password123",
            },
            ipConfigs: [{
                ipv4: {
                    address: `${cluster_config.network.subnet}.${cluster_config.worker.ip_start + i}/24`,
                    gateway: cluster_config.network.gateway,
                },
            }],
        },
    }, { provider: proxmoxProvider } as any);
    workers.push(vm);
}

export const masterNames = masters.map(m => m.name);
export const masterIPs = masters.map(m => (m as any).initialization.ipConfigs[0].ipv4.address);
export const workerNames = workers.map(w => (w as any).name);
export const workerIPs = workers.map(w => (w as any).initialization.ipConfigs[0].ipv4.address);