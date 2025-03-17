{pkgs}: {
  deps = [
    pkgs.openssh
    pkgs.connect
    pkgs.postgresql
    pkgs.jq
    pkgs.mysql
  ];
}
