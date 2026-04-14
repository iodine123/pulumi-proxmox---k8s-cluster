import * as pulumi from "@pulumi/pulumi";
import * as proxmox from "@muhlba91/pulumi-proxmoxve";
import * as dotenv from "dotenv";

dotenv.config();

const proxmoxProvider = new proxmox.Provider("my-proxmox", {
    endpoint: process.env.PROXMOX_VE_ENDPOINT,
    username: process.env.PROXMOX_VE_USERNAME,
    password: process.env.PROXMOX_VE_PASSWORD,
    insecure: true,
});

// Ganti jadi proxmox.vm.VirtualMachine
const k8sMaster = new proxmox.vm.VirtualMachine("k8s-master", {
    nodeName: "pve-lab",
    
    // @ts-ignore
    clone: {
        vmId: 9000, 
        full: true,
    },

    cpu: {
        cores: 2,
    },
    
    memory: {
        dedicated: 2048,
    },

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
                address: "192.168.10.51/24",
                gateway: "192.168.10.1",
            },
        }],
    },
}, { provider: proxmoxProvider } as any);

export const vmName = k8sMaster.name;