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
        memory: 3072,
        diskSize: 20,
        ip_start: 5
    },
    worker: {
        count: 2,
        cpu: 2,
        memory: 2048,
        diskSize: 20,
        ip_start: 10
    },
    ansible: {
        cpu: 1,
        memory: 1024,   
        diskSize: 15,
        ip: 30
    },
    network: {
        gateway: "192.168.198.2",
        subnet: "192.168.198"
    }
}

const user = `#cloud-config
users:
  - name: ansible_user
    groups: sudo
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCaqYWMxJQpyPJ7ud80wI+JI0r+KDMJg+vuGbH7dsu4IdN5bEr/gz/u7hBwiT2hCQq6Rk0jfiJOPPS9KRaQin7N+PD+y+51CwTZAt/sBhLdm2UYu/+PV/bcZOHn53SxVh0NcP1Vs1FuK+VgOOIWPl1kSVT88yy3/5ABAPRLDJBfDaUQoNXhJpJFJcltd0vuw+GAwkutB6dXo8m6SIvqWeHEqPbHdgzO7dSWcnpcSQGE4pqSTpypqS9q+SCPhDeVXojTUBHoHrbA4lPPbweEaJr+ja2+VSYcxP3A6huXJYUt9AmKwfBI6yI6cf7z3XJhq9crdDC2cvL9y4Y8y0xylrc9Kz8xZbLdMJ6wYveTG0D2ZqUewcPEvr9WRPAOLBsI7K3p6W1/s8caejWAZC034xru4/rh5SbLHlfs58bUGyYVqhOzeSXeFe8KVxXmx5t54iwYMBfmHMSXHxOy7o/LZbI64YmqnXwsUTBlKG6emeDe030I2lPYAWRSrzhYLRHo6fIgiW3jZx0yhVzF6oRNzWKVmPJvvxCCglnIMoKiXmvSGkx/kkSrgJ3bsfstE2EDEmid9eZTCNrZ+Efiabt8F+9lSXc6DPpISeTCxP07bOSGrQhz9a6aajlTjk7/qYeHA7MLbRNLgQ6fGjdTvaNyi/9XPupfruzVbxT7hslOF9Ciqw== iodinehanifan@gmail.com
  - name: admin123
    groups: sudo
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCaqYWMxJQpyPJ7ud80wI+JI0r+KDMJg+vuGbH7dsu4IdN5bEr/gz/u7hBwiT2hCQq6Rk0jfiJOPPS9KRaQin7N+PD+y+51CwTZAt/sBhLdm2UYu/+PV/bcZOHn53SxVh0NcP1Vs1FuK+VgOOIWPl1kSVT88yy3/5ABAPRLDJBfDaUQoNXhJpJFJcltd0vuw+GAwkutB6dXo8m6SIvqWeHEqPbHdgzO7dSWcnpcSQGE4pqSTpypqS9q+SCPhDeVXojTUBHoHrbA4lPPbweEaJr+ja2+VSYcxP3A6huXJYUt9AmKwfBI6yI6cf7z3XJhq9crdDC2cvL9y4Y8y0xylrc9Kz8xZbLdMJ6wYveTG0D2ZqUewcPEvr9WRPAOLBsI7K3p6W1/s8caejWAZC034xru4/rh5SbLHlfs58bUGyYVqhOzeSXeFe8KVxXmx5t54iwYMBfmHMSXHxOy7o/LZbI64YmqnXwsUTBlKG6emeDe030I2lPYAWRSrzhYLRHo6fIgiW3jZx0yhVzF6oRNzWKVmPJvvxCCglnIMoKiXmvSGkx/kkSrgJ3bsfstE2EDEmid9eZTCNrZ+Efiabt8F+9lSXc6DPpISeTCxP07bOSGrQhz9a6aajlTjk7/qYeHA7MLbRNLgQ6fGjdTvaNyi/9XPupfruzVbxT7hslOF9Ciqw== iodinehanifan@gmail.com
`;

// Create a new Proxmox VE virtual machine for the Kubernetes master node
for (let i = 1; i <= cluster_config.master.count; i++) {
    const vm =new proxmox.vm.VirtualMachine(`k8s-master-${i}`, {
        nodeName: "pve-lab",      
        // @ts-ignore  
        clone: {
            vmId: 9001, 
            full: true,
        },
        agent: {
            enabled: true,
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
            userData: user,
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
        agent: {
            enabled: true,
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
            userData: user,
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

// Install ansible server
const ansible =new proxmox.vm.VirtualMachine(`ansible-server`, {
        nodeName: "pve-lab",      
        // @ts-ignore  
        clone: {
            vmId: 9002, 
            full: true,
        },
        agent: {
            enabled: true,
        },
        cpu: {
            type: "host",
            cores: cluster_config.ansible.cpu,
        },
        memory: {
            dedicated: cluster_config.ansible.memory,
        },
        disks: [{
            datastoreId: "local-lvm",
            size: cluster_config.ansible.diskSize,
            interface: "scsi0",      
        }],
        networkDevices: [{
            bridge: "vmbr0",
            model: "virtio",
        }],
        // @ts-ignore
        initialization: {
            datastoreId: "local-lvm",
            userData: user,
            ipConfigs: [{
                ipv4: {
                    address: `${cluster_config.network.subnet}.${cluster_config.ansible.ip}/24`,       
                    gateway: cluster_config.network.gateway,
                },
            }],
        },


    }, { provider: proxmoxProvider } as any);

export const masterNames = masters.map(m => m.name);
export const masterIPs = masters.map(m => (m as any).initialization.ipConfigs[0].ipv4.address);
export const workerNames = workers.map(w => (w as any).name);
export const workerIPs = workers.map(w => (w as any).initialization.ipConfigs[0].ipv4.address);
export const ansibleName = (ansible as any).name;
export const ansibleIP = (ansible as any).initialization.ipConfigs[0].ipv4.address;