#!/bin/bash -x

apt-get update
apt-get -y upgrade
apt-get install -y python3-pip

pip3 install virtualenvwrapper

#run user-config
su -c "source /vagrant/user-config.sh" vagrant
